import type { ProductAttributeProperty, ProductAttributeValue, ShowConditionItem } from '@/services/temuShopCategoryService';

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

// 检查属性是否应该根据 showCondition 显示
// showCondition 定义了父子属性依赖关系：只有当父属性选择了指定值时，子属性才显示
export const shouldShowAttribute = (
  property: ProductAttributeProperty,
  allFormValues: AttributeFormValue[]
): boolean => {
  // 如果没有 showCondition，则始终显示
  if (!property.showCondition || property.showCondition.length === 0) {
    return true;
  }

  // 检查是否满足任一 showCondition（多个条件是 OR 关系）
  return property.showCondition.some((condition: ShowConditionItem) => {
    // 查找父属性的表单值（通过 refPid 匹配）
    const parentFormValue = allFormValues.find(
      fv => fv.property.refPid === condition.parentRefPid
    );

    if (!parentFormValue) {
      return false;
    }

    // 获取父属性已选择的值的 vid 列表
    let selectedVids: number[] = [];
    if (parentFormValue.selectedValue) {
      selectedVids = [parentFormValue.selectedValue.vid];
    } else if (parentFormValue.selectedValues && parentFormValue.selectedValues.length > 0) {
      selectedVids = parentFormValue.selectedValues.map(v => v.vid);
    }

    // 检查是否有任一选中的值在 parentVids 中
    return selectedVids.some(vid => condition.parentVids.includes(vid));
  });
};

// 过滤属性值：只返回满足父子依赖关系的值
// templatePropertyValueParentList 定义了值级别的父子依赖关系
export const getValidValues = (
  property: ProductAttributeProperty,
  allFormValues: AttributeFormValue[]
): ProductAttributeValue[] => {
  const values = property.values || [];

  // 如果没有父属性，则所有值都有效
  if (!property.parentTemplatePid) {
    return values;
  }

  // 如果没有 templatePropertyValueParentList，也返回所有值
  if (!property.templatePropertyValueParentList || property.templatePropertyValueParentList.length === 0) {
    return values;
  }

  // 查找父属性的表单值
  const parentFormValue = allFormValues.find(
    fv => fv.property.templatePid === property.parentTemplatePid
  );

  if (!parentFormValue) {
    return values;
  }

  // 获取父属性已选择的值的 vid 列表
  let parentSelectedVids: number[] = [];
  if (parentFormValue.selectedValue) {
    parentSelectedVids = [parentFormValue.selectedValue.vid];
  } else if (parentFormValue.selectedValues && parentFormValue.selectedValues.length > 0) {
    parentSelectedVids = parentFormValue.selectedValues.map(v => v.vid);
  }

  // 如果父属性没有选择值，则不显示任何子值
  if (parentSelectedVids.length === 0) {
    return [];
  }

  // 根据 templatePropertyValueParentList 过滤有效值
  // 找到所有匹配父属性选中值的项，合并它们的 vidList
  const validVids = new Set<number>();
  for (const parentItem of property.templatePropertyValueParentList) {
    // 检查是否有任一父选中值在 parentVidList 中
    const matches = parentSelectedVids.some(vid => parentItem.parentVidList.includes(vid));
    if (matches) {
      // 将这个项的 vidList 加入有效值集合
      parentItem.vidList.forEach(vid => validVids.add(vid));
    }
  }

  // 如果没有找到匹配的有效值，返回空数组
  if (validVids.size === 0) {
    return [];
  }

  // 只返回在有效值集合中的值
  return values.filter(value => validVids.has(value.vid));
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

/**
 * 过滤出需要显示的属性
 * 包括：
 * 1. 必填属性 (required: true)
 * 2. 必填属性的父属性（即使它们本身不是必填的）
 *
 * 这样可以确保当子属性依赖父属性时，父属性也会显示在界面上供用户选择
 */
export const filterPropertiesWithDependencies = (
  properties: ProductAttributeProperty[]
): ProductAttributeProperty[] => {
  // 第一步：收集所有必填属性
  const requiredProps = properties.filter(prop => prop.required);

  // 第二步：收集所有必填属性依赖的父属性的 templatePid
  const requiredParentTemplatePids = new Set<number>();
  for (const prop of requiredProps) {
    // 如果属性有 parentTemplatePid，说明它依赖父属性
    if (prop.parentTemplatePid && prop.parentTemplatePid > 0) {
      requiredParentTemplatePids.add(prop.parentTemplatePid);
    }
    // 如果属性有 showCondition，收集其中的父属性
    if (prop.showCondition && prop.showCondition.length > 0) {
      for (const condition of prop.showCondition) {
        // 通过 parentRefPid 找到父属性
        const parentProp = properties.find(p => p.refPid === condition.parentRefPid);
        if (parentProp) {
          requiredParentTemplatePids.add(parentProp.templatePid);
        }
      }
    }
  }

  // 第三步：递归收集父属性的父属性（处理多级依赖）
  let changed = true;
  while (changed) {
    changed = false;
    for (const prop of properties) {
      if (requiredParentTemplatePids.has(prop.templatePid)) {
        // 这个属性被标记为需要显示，检查它的父属性
        if (prop.parentTemplatePid && prop.parentTemplatePid > 0) {
          if (!requiredParentTemplatePids.has(prop.parentTemplatePid)) {
            requiredParentTemplatePids.add(prop.parentTemplatePid);
            changed = true;
          }
        }
      }
    }
  }

  // 第四步：合并必填属性和它们的父属性
  const result: ProductAttributeProperty[] = [];
  const addedTemplatePids = new Set<number>();

  for (const prop of properties) {
    if (prop.required || requiredParentTemplatePids.has(prop.templatePid)) {
      if (!addedTemplatePids.has(prop.templatePid)) {
        result.push(prop);
        addedTemplatePids.add(prop.templatePid);
      }
    }
  }

  return result;
};
