type AdminUpdateExecutorResult = {
  message: string;
};

export type AdminUpdateModule = {
  default?: () => Promise<AdminUpdateExecutorResult>;
  runAdminUpdate?: () => Promise<AdminUpdateExecutorResult>;
};

export type RegisteredAdminUpdate = {
  fileName: string;
  module: AdminUpdateModule;
};

export { adminUpdateRegistry } from "./registry.generated";
