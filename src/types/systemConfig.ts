// 系统配置
export interface SystemConfig {
  id: string;
  configKey: string;      // 配置键名
  configValue: string;    // 配置值
  configType?: string;    // 配置类型（如: temu, general）
  description?: string;   // 配置描述
  createdAt: string;
  updatedAt: string;
}

// 创建系统配置请求
export interface CreateSystemConfigRequest {
  configKey: string;
  configValue: string;
  configType?: string;
  description?: string;
}

// 更新系统配置请求
export interface UpdateSystemConfigRequest {
  configValue: string;
  configType?: string;
  description?: string;
}
