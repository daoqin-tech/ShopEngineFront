// 店铺类型
export type ShopType = '全托' | '半托';

// 商品分类类型定义
export interface ProductCategory {
  id: string;                   // 分类ID
  name: string;                 // 分类显示名称
  categoryName: string;         // 分类完整路径
  categoryId: string;           // 分类ID
  productAttributes: string;    // 产品属性JSON字符串
}

// 商品规格类型定义
export interface ProductSpec {
  id: string;                   // 规格ID (如: '40-sheets-15.2x15.2')
  name: string;                 // 规格名称 (如: '40张 15.2cm×15.2cm')
  sheets: number;               // 张数
  size: string;                 // 尺寸描述 (如: '15.2cm×15.2cm')

  // 物理属性
  length: number;               // 长度(cm)
  width: number;                // 宽度(cm)
  height: number;               // 高度(cm)
  weight: number;               // 重量(g)

  // 价格
  declaredPrice: number;        // 申报价格(人民币)
  suggestedRetailPrice: number; // 建议零售价(美元)

  // 变种信息
  variantName: string;          // 变种名称
  variantAttributeName1: string; // 变种属性名称一
  variantAttributeValue1: string; // 变种属性值一

  // 库存和发货
  stock: number;                // 库存
  shippingTime: number;         // 发货时效(天)

  // 商品规格和用途
  productSpec: string;          // 商品规格描述
  productUsage: string;         // 商品用途描述
}

// 店铺信息类型定义
export interface ShopInfo {
  id: string;                   // 店铺唯一标识
  name: string;                 // 店铺名称
  shopId: string;               // 店铺ID
  type: ShopType;               // 店铺类型：全托/半托
  businessCode: string;         // 货号前缀/业务编号
  account: string;              // 所属账号

  // 运费模板
  freightTemplateId?: string;   // 运费模板ID
  freightTemplateName?: string; // 运费模板名称

  // 经营站点
  operatingSite?: string;       // 经营站点
}

// 手账纸商品规格数据
export const JOURNAL_PAPER_SPECS: ProductSpec[] = [
  {
    id: 'journal-40-sheets-15.2x15.2',
    name: '40张 15.2cm×15.2cm',
    sheets: 40,
    size: '15.2cm×15.2cm',
    length: 15.2,
    width: 15.2,
    height: 1.0,
    weight: 90,
    declaredPrice: 80,
    suggestedRetailPrice: 12,
    variantName: '纸',
    variantAttributeName1: '材质',
    variantAttributeValue1: '纸',
    stock: 6666,
    shippingTime: 9,
    productSpec: '40张15.2cmx15.2cm 拼贴纸',
    productUsage: '适用于手账拼贴、剪贴本装饰、DIY手工、贺卡制作及创意拼贴等用途'
  }
];

// 装饰纸商品规格数据
export const DECORATIVE_PAPER_SPECS: ProductSpec[] = [
  {
    id: 'decorative-20-sheets-30x30',
    name: '20张 30cm×30cm',
    sheets: 20,
    size: '30cm×30cm',
    length: 30.0,
    width: 30.0,
    height: 0.5,
    weight: 90,
    declaredPrice: 100,
    suggestedRetailPrice: 15,
    variantName: '纸',
    variantAttributeName1: '材质',
    variantAttributeValue1: '纸',
    stock: 6666,
    shippingTime: 9,
    productSpec: '礼品包装纸-Gift Wrap Paper 20张30cmx30cm 装饰纸',
    productUsage: '适用于礼品包装、生日礼物包装、节日礼物装饰、婚礼礼品包装等场合'
  }
];

// 日历商品规格数据 (Mock数据)
export const CALENDAR_SPECS: ProductSpec[] = [
  {
    id: 'calendar-single-20x30',
    name: '2026年日历',
    sheets: 13,
    size: '21cm×29.7cm',
    length: 29.7,
    width: 21.0,
    height: 1.0,
    weight: 90,
    declaredPrice: 150,
    suggestedRetailPrice: 18,
    variantName: '纸',
    variantAttributeName1: '材质',
    variantAttributeValue1: '纸',
    stock: 6666,
    shippingTime: 9,
    productSpec: '2026年日历',
    productUsage: '适用于墙面装饰、日程规划、日期提醒、节日记录、时间管理等用途'
  },
];

// 兼容性：保留原有的 PRODUCT_SPECS 导出，默认为手账纸规格
export const PRODUCT_SPECS = JOURNAL_PAPER_SPECS;

// Temu店铺数据
export const TEMU_SHOPS: ShopInfo[] = [
  // Temu 卖家账号B (18071105270)
  {
    id: 'paper-petals',
    name: 'Paper Petals',
    shopId: '634418226369318',
    type: '半托',
    businessCode: '5270A',
    account: '18071105270',
    freightTemplateId: 'HFT-16191232475259000806',
    freightTemplateName: '运费模板',
    operatingSite: '美国'
  },
  // {
  //   id: 'artful-spirals',
  //   name: 'Artful Spirals',
  //   shopId: '634418226384302',
  //   type: '全托',
  //   account: '18071105270',
  //   categoryName: '',
  //   categoryId: ''
  // },
  // {
  //   id: 'the-gifted-page',
  //   name: 'The Gifted Page',
  //   shopId: '634418226384222',
  //   type: '全托',
  //   account: '18071105270',
  //   categoryName: '',
  //   categoryId: ''
  // },
  // {
  //   id: 'the-green-spiral',
  //   name: 'The Green Spiral',
  //   shopId: '634418226370526',
  //   type: '全托',
  //   account: '18071105270',
  //   categoryName: '',
  //   categoryId: ''
  // },

  {
    id: 'present-perfect-papers',
    name: 'Emily goods',
    shopId: '634418226370400',
    type: '半托',
    businessCode: '5270B',
    account: '18071105270',
    freightTemplateId: 'HFT-16191270999941411888',
    freightTemplateName: '运费模板',
    operatingSite: '美国'
  },
  // {
  //   id: 'jolly-wrappings',
  //   name: 'Jolly Wrappings',
  //   shopId: '634418226370462',
  //   type: '半托',
  //   account: '18071105270',
  //   categoryName: '',
  //   categoryId: ''
  // },

  // Temu 卖家账号C (13318288060)
  // {
  //   id: 'festive-fold-papers',
  //   name: 'Festive Fold Papers',
  //   shopId: '634418226385393',
  //   type: '全托',
  //   account: '13318288060',
  //   categoryName: '',
  //   categoryId: ''
  // },
  // {
  //   id: 'the-gift-wrap-collective',
  //   name: 'The Gift Wrap Collective',
  //   shopId: '634418226385374',
  //   type: '全托',
  //   account: '13318288060',
  //   categoryName: '',
  //   categoryId: ''
  // },
  // {
  //   id: 'rainbowhive-products',
  //   name: 'RainbowHive Products',
  //   shopId: '634418222312396',
  //   type: '全托',
  //   account: '13318288060',
  //   categoryName: '',
  //   categoryId: ''
  // },
  {
    id: 'paper-palette-gifts',
    name: 'Paper Palette Gifts',
    shopId: '634418226385309',
    type: '半托',
    businessCode: '8060A',
    account: '13318288060',
    freightTemplateId: 'HFT-16191228050268220413',
    freightTemplateName: '运费模板',
    operatingSite: '美国'
  },
  {
    id: 'wrap-wonder-paper-co',
    name: 'Wrap Wonder Paper Co',
    shopId: '634418226384979',
    type: '半托',
    businessCode: '8060B',
    account: '13318288060',
    freightTemplateId: 'HFT-16191332236779530083',
    freightTemplateName: '运费模板',
    operatingSite: '美国'
  },

  // Temu 卖家账号D (18986183395)
  // {
  //   id: 'the-impressory',
  //   name: 'The Impressory',
  //   shopId: '634418226386473',
  //   type: '全托',
  //   account: '18986183395',
  //   categoryName: '',
  //   categoryId: ''
  // },
  // {
  //   id: 'precision-press-paper-co',
  //   name: 'Precision Press Paper Co',
  //   shopId: '634418226386048',
  //   type: '全托',
  //   account: '18986183395',
  //   categoryName: '',
  //   categoryId: ''
  // },
  // {
  //   id: 'ecochic-wrappings',
  //   name: 'EcoChic Wrappings',
  //   shopId: '634418226385986',
  //   type: '全托',
  //   account: '18986183395',
  //   categoryName: '',
  //   categoryId: ''
  // },
  {
    id: 'kaleidowrap-designs',
    name: 'KaleidoWrap Designs',
    shopId: '634418226385892',
    type: '半托',
    businessCode: '3395A',
    account: '18986183395',
    freightTemplateId: 'HFT-16191226267689110996',
    freightTemplateName: '运费模板',
    operatingSite: '美国'
  },
  {
    id: 'merry-measure-paper-co',
    name: 'Merry Measure Paper Co',
    shopId: '634418226385864',
    type: '半托',
    businessCode: '3395B',
    account: '18986183395',
    freightTemplateId: 'HFT-16191333641871510968',
    freightTemplateName: '运费模板',
    operatingSite: '美国'
  },
  // {
  //   id: 'artisan-wrap-depot',
  //   name: 'Artisan Wrap Depot',
  //   shopId: '634418226385538',
  //   type: '半托',
  //   account: '18986183395',
  //   categoryName: '',
  //   categoryId: ''
  // }
];

// 装饰纸商品分类数据
export const DECORATIVE_PAPER_CATEGORIES: ProductCategory[] = [
  {
    id: 'gift-wrapping-paper',
    name: '礼品包装纸',
    categoryName: '艺术品、工艺品和缝纫用品/礼品包装用品/礼品包装纸',
    categoryId: '39883',
    productAttributes: '[{"propName":"材料","refPid":121,"pid":89,"templatePid":909872,"numberInputValue":"","valueUnit":"","vid":"2491","propValue":"纸"},{"propName":"材料","refPid":121,"pid":89,"templatePid":909872,"numberInputValue":"","valueUnit":"","vid":"3906","propValue":"聚丙烯pp"},{"propName":"颜色","refPid":63,"pid":13,"templatePid":447652,"numberInputValue":"","valueUnit":"","vid":"376","propValue":"白色"},{"propName":"颜色","refPid":63,"pid":13,"templatePid":447652,"numberInputValue":"","valueUnit":"","vid":"433","propValue":"米白色"},{"propName":"颜色","refPid":63,"pid":13,"templatePid":447652,"numberInputValue":"","valueUnit":"","vid":"26419","propValue":"混合色"},{"propName":"包含的组件","refPid":125,"pid":91,"templatePid":447653,"numberInputValue":"","valueUnit":"","vid":"31034","propValue":"无"},{"propName":"语言类型","refPid":3673,"pid":1735,"templatePid":1492022,"numberInputValue":"","valueUnit":"","vid":"62905","propValue":"英语"},{"propName":"是否有克重>29g/㎡的sku","refPid":7393,"pid":2260,"templatePid":1451180,"numberInputValue":"","valueUnit":"","vid":"241820","propValue":"否"},{"propName":"是否涂有蜡、石蜡或聚合物","refPid":7394,"pid":2261,"templatePid":1451209,"numberInputValue":"","valueUnit":"","vid":"241824","propValue":"否"},{"propName":"主题","refPid":130,"pid":126,"templatePid":447654,"numberInputValue":"","valueUnit":"","vid":"3369","propValue":"雪花"},{"propName":"动物主题","refPid":441,"pid":128,"templatePid":447651,"numberInputValue":"","valueUnit":"","vid":"12602","propValue":"驯鹿"}]'
  },
  {
    id: 'gift-wrapping-bag',
    name: '礼品包装袋',
    categoryName: '艺术品、工艺品和缝纫用品/礼品包装用品/礼品包装袋',
    categoryId: '39879',
    productAttributes: '[{"propName":"是否有提手","refPid":7228,"pid":2197,"templatePid":1410540,"numberInputValue":"","valueUnit":"","vid":"210451","propValue":"否"},{"propName":"材料","refPid":121,"pid":89,"templatePid":909806,"numberInputValue":"","valueUnit":"","vid":"2491","propValue":"纸"},{"propName":"材料","refPid":121,"pid":89,"templatePid":909806,"numberInputValue":"","valueUnit":"","vid":"11783","propValue":"无铅水晶"},{"propName":"包含的组件","refPid":125,"pid":91,"templatePid":447663,"numberInputValue":"","valueUnit":"","vid":"31034","propValue":"无"},{"propName":"颜色","refPid":63,"pid":13,"templatePid":447662,"numberInputValue":"","valueUnit":"","vid":"376","propValue":"白色"},{"propName":"颜色","refPid":63,"pid":13,"templatePid":447662,"numberInputValue":"","valueUnit":"","vid":"530","propValue":"褐色"}]'
  }
];

// 手账纸商品分类数据
export const JOURNAL_PAPER_CATEGORIES: ProductCategory[] = [
  {
    id: 'paper-petals-category',
    name: '卡片',
    categoryName: '办公用品/日常办公用品/办公用纸张/卡片/卡片',
    categoryId: '1107',
    productAttributes: '[{"propName":"主体材质","refPid":1920,"pid":1,"templatePid":1495436,"numberInputValue":"","valueUnit":"","vid":"1350","propValue":"纸"}]'
  },
  {
    id: 'present-perfect-papers-category',
    name: '卡片',
    categoryName: '办公用品/日常办公用品/办公用纸张/卡片/卡片',
    categoryId: '1107',
    productAttributes: '[{"propName":"主体材质","refPid":1920,"pid":1,"templatePid":1495436,"numberInputValue":"","valueUnit":"","vid":"1350","propValue":"纸"}]'
  },
  {
    id: 'paper-palette-gifts-category',
    name: '纸',
    categoryName: '艺术品、工艺品和缝纫用品/剪贴、压印/纸张和卡片/纸',
    categoryId: '39489',
    productAttributes: '[{"propName":"颜色","refPid":63,"pid":13,"templatePid":447425,"numberInputValue":"","valueUnit":"","vid":"433","propValue":"米白色"},{"propName":"主题","refPid":130,"pid":126,"templatePid":447426,"numberInputValue":"","valueUnit":"","vid":"2906","propValue":"圣诞节"}]'
  },
  {
    id: 'wrap-wonder-paper-co-category',
    name: '手工彩纸',
    categoryName: '艺术品、工艺品和缝纫用品/工艺工具和用品/纸艺/工艺纸张/手工彩纸',
    categoryId: '39714',
    productAttributes: '[{"propName":"材质","refPid":12,"pid":1,"templatePid":958166,"numberInputValue":"","valueUnit":"","vid":"413","propValue":"纸张"}]'
  },
  {
    id: 'kaleidowrap-designs-category',
    name: '卡片纸',
    categoryName: '艺术品、工艺品和缝纫用品/工艺工具和用品/纸艺/工艺纸张/卡片纸',
    categoryId: '39721',
    productAttributes: '[{"propName":"材质","refPid":12,"pid":1,"templatePid":952989,"numberInputValue":"","valueUnit":"","vid":"413","propValue":"纸张"}]'
  },
  {
    id: 'merry-measure-paper-co-category',
    name: '纸',
    categoryName: '艺术品、工艺品和缝纫用品 > 剪贴、压印 > 纸张和卡片 > 纸',
    categoryId: '39489',
    productAttributes: '[{"propName":"颜色","refPid":63,"pid":13,"templatePid":447425,"numberInputValue":"","valueUnit":"","vid":"433","propValue":"米白色"},{"propName":"主题","refPid":130,"pid":126,"templatePid":447426,"numberInputValue":"","valueUnit":"","vid":"2906","propValue":"圣诞节"}]'
  }
];

// 日历商品分类数据
export const CALENDAR_CATEGORIES: ProductCategory[] = [
  {
    id: 'calendar-wall-category',
    name: '挂历',
    categoryName: '办公用品>日常办公用品>日历及个人规划用品>挂历',
    categoryId: '985',
    productAttributes: '[{"propName":"主体材质","refPid":1920,"pid":1,"templatePid":1562398,"numberInputValue":"","valueUnit":"","vid":"1350","propValue":"纸"},{"propName":"是否印刷日期","refPid":7424,"pid":2287,"templatePid":1483032,"numberInputValue":"","valueUnit":"","vid":"246628","propValue":"dated"},{"propName":"起始年份","refPid":7465,"pid":2294,"templatePid":1485843,"numberInputValue":"","valueUnit":"","vid":"278025","propValue":"2026"},{"propName":"起始月份","refPid":7475,"pid":2299,"templatePid":1488062,"numberInputValue":"","valueUnit":"","vid":"280351","propValue":"1月"},{"propName":"结束年份","refPid":7503,"pid":2309,"templatePid":1492273,"numberInputValue":"","valueUnit":"","vid":"326008","propValue":"2026"},{"propName":"结束月份","refPid":7527,"pid":2325,"templatePid":1495470,"numberInputValue":"","valueUnit":"","vid":"327909","propValue":"12月"},{"propName":"文字语言","refPid":4086,"pid":1735,"templatePid":999019,"numberInputValue":"","valueUnit":"","vid":"62905","propValue":"英语"}]'
  },
  {
    id: 'calendar-desk-category',
    name: '台历',
    categoryName: '办公用品>日常办公用品>日历及个人规划用品>台历>台历',
    categoryId: '989',
    productAttributes: '[{"propName":"是否印刷日期","refPid":7424,"pid":2287,"templatePid":1483033,"numberInputValue":"","valueUnit":"","vid":"246628","propValue":"dated"},{"propName":"起始年份","refPid":7465,"pid":2294,"templatePid":1485846,"numberInputValue":"","valueUnit":"","vid":"278025","propValue":"2026"},{"propName":"起始月份","refPid":7475,"pid":2299,"templatePid":1488061,"numberInputValue":"","valueUnit":"","vid":"280351","propValue":"1月"},{"propName":"结束年份","refPid":7503,"pid":2309,"templatePid":1492274,"numberInputValue":"","valueUnit":"","vid":"326008","propValue":"2026"},{"propName":"结束月份","refPid":7527,"pid":2325,"templatePid":1495472,"numberInputValue":"","valueUnit":"","vid":"327909","propValue":"12月"},{"propName":"主体材质","refPid":1920,"pid":1,"templatePid":1140713,"numberInputValue":"","valueUnit":"","vid":"1350","propValue":"纸"},{"propName":"文字语言","refPid":4086,"pid":1735,"templatePid":999025,"numberInputValue":"","valueUnit":"","vid":"62905","propValue":"英语"},{"propName":"看法","refPid":704,"pid":813,"templatePid":370014,"numberInputValue":"","valueUnit":"","vid":"22127","propValue":"每周"}]'
  },
  {
    id: 'calendar-wall-planner-category',
    name: '墙挂式规划表',
    categoryName: '办公用品>日常办公用品>日历及个人规划用品>墙挂式规划表',
    categoryId: '993',
    productAttributes: '[{"propName":"是否印刷日期","refPid":7424,"pid":2287,"templatePid":1483866,"numberInputValue":"","valueUnit":"","vid":"246628","propValue":"dated"},{"propName":"起始年份","refPid":7465,"pid":2294,"templatePid":1485844,"numberInputValue":"","valueUnit":"","vid":"278025","propValue":"2026"},{"propName":"起始月份","refPid":7475,"pid":2299,"templatePid":1488063,"numberInputValue":"","valueUnit":"","vid":"280351","propValue":"1月"},{"propName":"结束年份","refPid":7503,"pid":2309,"templatePid":1491196,"numberInputValue":"","valueUnit":"","vid":"326008","propValue":"2026"},{"propName":"结束月份","refPid":7527,"pid":2325,"templatePid":1495471,"numberInputValue":"","valueUnit":"","vid":"327909","propValue":"12月"},{"propName":"计划本类型","refPid":7423,"pid":2286,"templatePid":1483031,"numberInputValue":"","valueUnit":"","vid":"246619","propValue":"日计划"},{"propName":"主体材质","refPid":1920,"pid":1,"templatePid":962558,"numberInputValue":"","valueUnit":"","vid":"1350","propValue":"纸"},{"propName":"目标听众","refPid":434,"pid":437,"templatePid":369743,"numberInputValue":"","valueUnit":"","vid":"17047","propValue":"成人"}]'
  }
];

// 兼容性：保留原有的 PRODUCT_CATEGORIES 导出，默认为手账纸分类
export const PRODUCT_CATEGORIES = JOURNAL_PAPER_CATEGORIES;