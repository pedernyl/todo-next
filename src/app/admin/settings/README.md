# Admin Settings YAML Format

This folder contains YAML definitions for Admin Settings.

Each YAML file should represent one component/function/domain setting group.

Examples:
- app-level settings in `app.yaml`
- loader debug settings in `loader.yaml`

## Required top-level keys

- `name` (string): unique group key, for example `loader`
- `type` (string): grouping key shown in Admin output, for example `app` or `debug`
- `fields` (array): one or more field definitions

## Optional top-level keys

- `title` (string): display title in Admin UI (defaults to `name`)
- `description` (string): helper text shown in Admin UI

## Field definition format

Each field in `fields` must include:

- `key` (string): unique within this YAML file
- `label` (string): UI label
- `type` (string): one of:
  - `text`
  - `boolean`
  - `number`
  - `textarea`
  - `select`

Optional field properties:

- `description` (string)
- `placeholder` (string)
- `default` (any; should match the field type)
- `min`/`max`/`step` (number fields)
- `options` (select fields only): non-empty array of `{ label, value }`

## Persistence model

- YAML is schema only (UI + validation metadata)
- Values are saved in database table `Settings`
- One row per YAML `name` + `type`
- Field values are stored as JSON in `settings`
- Audit columns are updated on each save (`changed_by`, `changed_timestamp`)

## Example

```yaml
name: loader
type: debug
title: Loader Debug Settings
description: Loader debugging and timing settings.
fields:
  - key: debugLoader
    label: Debug Loader
    type: boolean
    default: false
  - key: loaderDelaySeconds
    label: Loader Delay (seconds)
    type: number
    default: 0
    min: 0
    step: 1
```

## Validation rules

- `name` + `type` must be unique across all YAML files in this folder
- `key` must be unique within each YAML file
- `select` fields must provide at least one option
