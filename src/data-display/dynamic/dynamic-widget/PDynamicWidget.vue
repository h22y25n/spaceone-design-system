<template>
    <component :is="component"
               :index="index"
               :name="name"
               :schema-options="schemaOptions"
               :data="data"
               :loading="loading"
               :view-options="viewOptions"
               :field-handler="fieldHandler"
               class="p-dynamic-widget"
    />
</template>

<script lang="ts">
import {
    computed, defineComponent, PropType,
    reactive, toRefs, watch,
} from '@vue/composition-api';
import {
    DYNAMIC_WIDGET_TYPE,
    DynamicWidgetFieldHandler,
    DynamicWidgetProps,
} from '@/data-display/dynamic/dynamic-widget/type';
import PSkeleton from '@/feedbacks/loading/skeleton/PSkeleton.vue';
import PPaneLayout from '@/layouts/pane-layout/PPaneLayout.vue';


export default defineComponent<DynamicWidgetProps>({
    name: 'PDynamicWidget',
    components: { PPaneLayout, PSkeleton },
    props: {
        index: {
            type: Number,
            default: 0,
        },
        type: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            default: '',
        },
        schemaOptions: {
            type: Object,
            default: () => ({}),
        },
        data: {
            type: [Object, String, Number, Array],
            default: undefined,
        },
        loading: {
            type: Boolean,
            default: false,
        },
        viewOptions: {
            type: Object,
            default: () => ({}),
        },
        fieldHandler: {
            type: Function as PropType<DynamicWidgetFieldHandler|undefined>,
            default: undefined,
        },
    },
    setup(props) {
        // noinspection TypeScriptCheckImport
        const state = reactive({
            component: null as any,
            loader: computed<() => Promise<any>>(() => () => import(/* webpackMode: "eager" */ `./templates/${props.type}/index.vue`)) as unknown as () => Promise<any>,
        });

        const getComponent = async () => {
            try {
                await state.loader();

                if (!DYNAMIC_WIDGET_TYPE.includes(props.type)) {
                    throw new Error(`[Dynamic Widget] Unacceptable widget type: widget type must be one of ${DYNAMIC_WIDGET_TYPE}. ${props.type} is not acceptable.`);
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
            getComponent,
        };
    },
});
</script>

<style lang="postcss">
.p-dynamic-widget {
    @apply overflow-hidden;
}
</style>
