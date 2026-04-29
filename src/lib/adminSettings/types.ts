export type AdminSettingFieldType = "text" | "boolean" | "number" | "textarea" | "select";

export type AdminSettingSelectOption = {
  label: string;
  value: string;
};

export type AdminSettingFieldDefinition = {
  key: string;
  label: string;
  type: AdminSettingFieldType;
  description?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: AdminSettingSelectOption[];
  default?: unknown;
};

export type AdminSettingsDefinition = {
  name: string;
  type: string;
  title?: string;
  description?: string;
  fields: AdminSettingFieldDefinition[];
};

export type AdminSettingsStoredRow = {
  id: number;
  name: string;
  type: string;
  settings: Record<string, unknown> | null;
  changed_by: number | null;
  changed_timestamp: string | null;
};

export type AdminSettingsGroupState = {
  id: number | null;
  name: string;
  type: string;
  title: string;
  description: string;
  fields: AdminSettingFieldDefinition[];
  values: Record<string, unknown>;
  changedBy: number | null;
  changedTimestamp: string | null;
};

export type AdminSettingsTypeGroup = {
  type: string;
  settings: AdminSettingsGroupState[];
};
