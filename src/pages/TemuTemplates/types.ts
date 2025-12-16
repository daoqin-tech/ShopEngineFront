import type { ProductAttributeProperty, ProductAttributeValue } from '@/services/temuShopCategoryService';

// Temu 站点配置类型
export interface TemuSite {
  siteId: number;
  siteName: string;
  isOpen?: boolean;
  region?: string | null;
}

// 用户填写的属性值
export interface AttributeFormValue {
  property: ProductAttributeProperty;
  selectedValue?: ProductAttributeValue;       // 单选时使用
  selectedValues?: ProductAttributeValue[];    // 多选时使用
  customValue?: string;
  numberInputValue?: string;
}

// 判断属性是否支持多选
export const isMultiSelect = (property: ProductAttributeProperty): boolean => {
  return (property.chooseMaxNum ?? 1) > 1;
};

// 敏感属性类型常量
export const SENSITIVE_TYPES = [
  { id: 110001, name: '纯电' },
  { id: 120001, name: '内电' },
  { id: 130001, name: '磁性' },
  { id: 140001, name: '液体' },
  { id: 150001, name: '粉末' },
  { id: 160001, name: '膏体' },
  { id: 170001, name: '刀具' },
] as const;
