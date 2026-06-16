import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing environment variables');
    }

    // 1. Verify User
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Check if user is Admin and get org_id
    const { data: employeeData, error: empError } = await supabaseAdmin
      .from('employees')
      .select('organization_id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (empError || !employeeData || employeeData.role !== 'Administrador') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const orgId = employeeData.organization_id;

    // 3. Find active photos for this organization
    const { data: photos, error: photosError } = await supabaseAdmin
      .from('attendance_photos')
      .select('id, attendance_record_id, storage_path, file_size_bytes, description')
      .eq('organization_id', orgId)
      .is('deleted_at', null);

    if (photosError) throw photosError;
    if (!photos || photos.length === 0) {
      return new Response(JSON.stringify({ message: 'No photos to remove', removed: 0, bytesFreed: 0 }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. Collect paths to delete
    const storagePaths = photos.map(p => p.storage_path).filter(Boolean);
    const photoIds = photos.map(p => p.id);
    const recordIds = photos.map(p => p.attendance_record_id).filter(Boolean);
    
    let bytesFreed = 0;
    photos.forEach(p => { bytesFreed += (p.file_size_bytes || 0); });

    // 5. Delete from Storage bucket
    if (storagePaths.length > 0) {
      const { data: deleteData, error: storageError } = await supabaseAdmin.storage
        .from('attendance-photos')
        .remove(storagePaths);
      
      if (storageError) {
        console.error('Storage deletion error:', storageError);
        throw new Error('Failed to delete files from storage bucket');
      }
    }

    // 6. Update attendance_photos metadata
    const { error: updatePhotosError } = await supabaseAdmin
      .from('attendance_photos')
      .update({ 
        deleted_at: new Date().toISOString(),
        description: '[REMOVIDA PELO ADMIN]'
      })
      .in('id', photoIds);

    if (updatePhotosError) throw updatePhotosError;

    // 7. Update attendance_records status
    if (recordIds.length > 0) {
      const { error: updateRecordsError } = await supabaseAdmin
        .from('attendance_records')
        .update({
          photo_status: 'removed',
          notes: 'Evidência visual removida do armazenamento pelo administrador.'
        })
        .in('id', recordIds);
        
      // It's possible some constraints block this if 'removed' isn't valid, but we assume the migration is run.
      if (updateRecordsError) {
        console.error('Record update error. Ensure MIGRATION_5_9_4_1_STORAGE_STATUS_REMOVED was run:', updateRecordsError);
        // We don't throw because the files are already deleted.
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      removed: photos.length, 
      bytesFreed 
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
