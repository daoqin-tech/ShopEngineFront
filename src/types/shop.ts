// 店铺类型
export type ShopType = '全托' | '半托';

// 店铺信息类型定义
export interface ShopInfo {
  id: string;
  name: string;          // 店铺名称
  shopId: string;        // 店铺ID
  type: ShopType;        // 店铺类型：全托/半托
  businessCode?: string; // 业务编号
  description?: string;  // 备注描述
  account: string;       // 所属账号
  categoryName?: string; // 分类名称
  categoryId?: string;   // 分类ID

  // 运费模板
  freightTemplateId?: string;   // 运费模板ID
  freightTemplateName?: string; // 运费模板名称

  // 经营站点
  operatingSite?: string;       // 经营站点

  // 商品尺寸和重量
  length?: number;              // 长度(cm)
  width?: number;               // 宽度(cm)
  height?: number;              // 高度(cm)
  weight?: number;              // 重量(g)

  // 价格
  declaredPrice?: number;       // 申报价格(人民币)
  suggestedRetailPrice?: number; // 建议零售价(美元)

  // 变种信息
  variantName?: string;         // 变种名称
  variantAttributeName1?: string; // 变种属性名称一
  variantAttributeValue1?: string; // 变种属性值一

  // 库存和发货
  stock?: number;               // 库存
  shippingTime?: number;        // 发货时效(天)

  // 货号
  productCodePrefix?: string;   // 货号前缀

  // 产品属性
  productAttributes?: string;   // 产品属性JSON字符串

  // 商品规格
  productSpec?: string;         // 商品规格描述

  // 用途
  productUsage?: string;        // 商品用途描述
}

// Temu店铺数据
export const TEMU_SHOPS: ShopInfo[] = [
  // Temu 卖家账号B (18071105270)
    {
    id: 'spiral-paperie',
    name: 'Spiral Paperie',
    shopId: '634418226369318',
    type: '半托',
    businessCode: '5270A',
    description: '主要售卖 15.2cm*15.2cm，40张，定价80元/12美元的产品',
    account: '18071105270',
    categoryName: '艺术品、工艺品和缝纫用品 > 工艺工具和用品 > 纸艺 > 工艺纸张 > 装饰纸',
    categoryId: '39715',
    freightTemplateId: 'HFT-16191232475259000806',
    operatingSite: '美国',
    length: 15.2,
    width: 15.2,
    height: 1.0,
    weight: 90,
    declaredPrice: 80,
    suggestedRetailPrice: 12,
    variantName: '纸',
    variantAttributeName1: '材质',
    variantAttributeValue1: '纸',
    stock: 99999,
    shippingTime: 9,
    productCodePrefix: '5270A',
    productAttributes: '[{"propName":"材料","refPid":121,"pid":89,"templatePid":931632,"numberInputValue":"","valueUnit":"","vid":"3333","propValue":"纸张"}]',
    productSpec: '40 张15.2cmx15.2cm',
    productUsage: '适用于拼贴、DIY手艺纸、装饰纸、贺卡制作及礼物包装与家居装饰'
  },
  {
    id: 'artful-spirals',
    name: 'Artful Spirals',
    shopId: '634418226384302',
    type: '全托',
    account: '18071105270',
    categoryName: '',
    categoryId: ''
  },
  {
    id: 'the-gifted-page',
    name: 'The Gifted Page',
    shopId: '634418226384222',
    type: '全托',
    account: '18071105270',
    categoryName: '',
    categoryId: ''
  },
  {
    id: 'the-green-spiral',
    name: 'The Green Spiral',
    shopId: '634418226370526',
    type: '全托',
    account: '18071105270',
    categoryName: '',
    categoryId: ''
  },

  {
    id: 'present-perfect-papers',
    name: 'Present Perfect Papers',
    shopId: '634418226370400',
    type: '半托',
    businessCode: '5270B',
    description: '主要售卖 30cm*30cm，20张，定价100元/15美元的产品',
    account: '18071105270',
    categoryName: '艺术品、工艺品和缝纫用品/剪贴、压印/其他（剪贴、压印）',
    categoryId: '39421',
    freightTemplateId: 'HFT-16191270999941411888'
  },
  {
    id: 'jolly-wrappings',
    name: 'Jolly Wrappings',
    shopId: '634418226370462',
    type: '半托',
    account: '18071105270',
    categoryName: '',
    categoryId: ''
  },

  // Temu 卖家账号C (13318288060)
  {
    id: 'festive-fold-papers',
    name: 'Festive Fold Papers',
    shopId: '634418226385393',
    type: '全托',
    account: '13318288060',
    categoryName: '',
    categoryId: ''
  },
  {
    id: 'the-gift-wrap-collective',
    name: 'The Gift Wrap Collective',
    shopId: '634418226385374',
    type: '全托',
    account: '13318288060',
    categoryName: '',
    categoryId: ''
  },
  {
    id: 'rainbowhive-products',
    name: 'RainbowHive Products',
    shopId: '634418222312396',
    type: '全托',
    account: '13318288060',
    categoryName: '',
    categoryId: ''
  },
  {
    id: 'paper-palette-gifts',
    name: 'Paper Palette Gifts',
    shopId: '634418226385309',
    type: '半托',
    businessCode: '8060A',
    description: '主要售卖 15.2cm*15.2cm，40张，定价80元/12美元的产品',
    account: '13318288060',
    categoryName: '艺术品、工艺品和缝纫用品/剪贴、压印/纸张和卡片/纸',
    categoryId: '39489',
    freightTemplateId: 'HFT-16191228050268220413'
  },
  {
    id: 'wrap-wonder-paper-co',
    name: 'Wrap Wonder Paper Co',
    shopId: '634418226384979',
    type: '半托',
    businessCode: '8060B',
    description: '主要售卖 30cm*30cm，20张，定价100元/15美元的产品',
    account: '13318288060',
    categoryName: '艺术品、工艺品和缝纫用品/工艺工具和用品/纸艺/工艺纸张/手工彩纸',
    categoryId: '39714',
    freightTemplateId: 'HFT-16191332236779530083'
  },

  // Temu 卖家账号D (18986183395)
  {
    id: 'the-impressory',
    name: 'The Impressory',
    shopId: '634418226386473',
    type: '全托',
    account: '18986183395',
    categoryName: '',
    categoryId: ''
  },
  {
    id: 'precision-press-paper-co',
    name: 'Precision Press Paper Co',
    shopId: '634418226386048',
    type: '全托',
    account: '18986183395',
    categoryName: '',
    categoryId: ''
  },
  {
    id: 'ecochic-wrappings',
    name: 'EcoChic Wrappings',
    shopId: '634418226385986',
    type: '全托',
    account: '18986183395',
    categoryName: '',
    categoryId: ''
  },
  {
    id: 'kaleidowrap-designs',
    name: 'KaleidoWrap Designs',
    shopId: '634418226385892',
    type: '半托',
    businessCode: '3395A',
    description: '主要售卖 15.2cm*15.2cm，40张，定价80元/12美元的产品',
    account: '18986183395',
    categoryName: '艺术品、工艺品和缝纫用品/工艺工具和用品/纸艺/其他（纸艺）',
    categoryId: '39704',
    freightTemplateId: 'HFT-16191226267689110996'
  },
  {
    id: 'merry-measure-paper-co',
    name: 'Merry Measure Paper Co',
    shopId: '634418226385864',
    type: '半托',
    businessCode: '3395B',
    description: '主要售卖 30cm*30cm，20张，定价100元/15美元的产品',
    account: '18986183395',
    categoryName: '艺术品、工艺品和缝纫用品/工艺工具和用品/纸艺/工艺纸张/手工折纸',
    categoryId: '39717',
    freightTemplateId: 'HFT-16191333641871510968'
  },
  {
    id: 'artisan-wrap-depot',
    name: 'Artisan Wrap Depot',
    shopId: '634418226385538',
    type: '半托',
    account: '18986183395',
    categoryName: '',
    categoryId: ''
  }
];