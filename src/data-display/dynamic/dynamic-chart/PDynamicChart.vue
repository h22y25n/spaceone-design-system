<template>
    <div class="p-dynamic-chart">
        <p-data-loader :loading="loading"
                       :data="data"
                       loader-type="skeleton"
        >
            <component :is="component"
                       :data="data"
                       :value-options="valueOptions"
                       :name-options="nameOptions"
                       :field-handler="fieldHandler"
                       :theme="theme"
                       class="chart"
            />
        </p-data-loader>
    </div>
</template>

<script lang="ts">
import {
    computed,
    defineComponent, PropType,
    reactive, toRefs, watch,
} from '@vue/composition-api';


import {
    DynamicChartFieldHandler,
    DynamicChartProps, DynamicChartTheme,
} from '@/data-display/dynamic/dynamic-chart/type';
import {
    DEFAULT_NAME_OPTIONS,
    DEFAULT_VALUE_OPTIONS, DYNAMIC_CHART_TYPE,
    DYNAMIC_CHART_THEMES,
} from '@/data-display/dynamic/dynamic-chart/config';
import PDataLoader from '@/feedbacks/loading/data-loader/PDataLoader.vue';

export default defineComponent<DynamicChartProps>({
    name: 'PDynamicChart',
    components: { PDataLoader },
    props: {
        type: {
            type: String,
            required: true,
        },
        loading: {
            type: Boolean,
            default: false,
        },
        data: {
            type: Array,
            default: () => [],
        },
        valueOptions: {
            type: Object as () => DynamicChartProps['valueOptions'],
            default: () => ({ ...DEFAULT_VALUE_OPTIONS }),
        },
        nameOptions: {
            type: Object as () => DynamicChartProps['nameOptions'],
            default: () => ({ ...DEFAULT_NAME_OPTIONS }),
        },
        fieldHandler: {
            type: Function as PropType<DynamicChartFieldHandler|undefined>,
            default: undefined,
        },
        theme: {
            type: String as PropType<DynamicChartTheme>,
            default: DYNAMIC_CHART_THEMES[0],
        },
    },
    setup(props) {
        // noinspection TypeScriptCheckImport
        const state = reactive({
            component: null as any,
            loader: computed<() => Promise<any>>(() => () => import(/* webpackMode: "eager" */ `./templates/${props.type.toLowerCase()}/index.vue`)) as unknown as () => Promise<any>,
        });

        const getComponent = async () => {
            try {
                await state.loader();

                if (!DYNAMIC_CHART_TYPE.includes(props.type)) {
                    throw new Error(`[Dynamic Chart] Unacceptable chart type: chart type must be one of ${DYNAMIC_CHART_TYPE}. ${props.type} is not acceptable.`);
                }

                state.component = async () => state.loader();
            } catch (e) {
                console.error(e);
            }
        };

        watch(() => props.type, (aft, bef) => {
            if (aft !== bef) {
                getComponent();
            }
        }, { immediate: true });

        return {
            ...toRefs(state),
        };
    },
});
</script>
<style lang="postcss">
.p-dynamic-chart {
    > .p-data-loader {
        height: 100%;
        > .data-loader-container .data-wrapper {
            overflow: hidden;
        }
        .chart {
            height: 100%;
        }
    }
}
</style>
