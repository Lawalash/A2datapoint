export type ProductMode = 'A2_DATAPOINT' | 'A2_FORM_FULL';

export const PRODUCT_MODE: ProductMode = 'A2_DATAPOINT';

export const productBranding = {
  A2_DATAPOINT: {
    namePrimary: 'A2',
    nameSecondary: 'DataPoint',
    subtitle: 'Controle de Ponto por Celular',
    sidebarTitle: 'A2 DataPoint',
    sidebarSubtitle: 'Controle de Ponto',
    documentTitle: 'A2 DataPoint',
  },
  A2_FORM_FULL: {
    namePrimary: 'A2',
    nameSecondary: 'FORM',
    subtitle: 'Controller',
    sidebarTitle: 'A2 FORM',
    sidebarSubtitle: 'Controller',
    documentTitle: 'A2 FORM Controller',
  },
};

export const currentBranding = productBranding[PRODUCT_MODE];
