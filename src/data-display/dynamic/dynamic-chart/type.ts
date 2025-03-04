import { DynamicField, DynamicFieldOptions } from '@/data-display/dynamic/dynamic-field/type/field-schema';
import { DYNAMIC_CHART_TYPE, DYNAMIC_CHART_THEMES } from '@/data-display/dynamic/dynamic-chart/config';
import { DynamicFieldHandler, DynamicFieldTypeOptions } from '@/data-display/dynamic/dynamic-field/type';


export type DynamicChartType = typeof DYNAMIC_CHART_TYPE[number]

export type DynamicChartFieldHandler<T = undefined> = DynamicFieldHandler<
    DynamicFieldOptions,
    DynamicFieldTypeOptions,
    DynamicField & T
    >

export type DynamicChartTheme = typeof DYNAMIC_CHART_THEMES[number]
export interface DynamicChartTemplateProps<Data=any> {
    data: Data[];
    valueOptions: DynamicField;
    nameOptions: DynamicField;
    fieldHandler?: DynamicChartFieldHandler;
    theme: DynamicChartTheme;
}

export interface DynamicChartProps<T=any> extends DynamicChartTemplateProps<T> {
    type: DynamicChartType;
    loading: boolean;
    limit: number;
}
