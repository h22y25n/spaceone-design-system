<template>
    <div class="p-query-search">
        <p-search :class="{'no-menu': menu ? menu.length === 0 : false}"
                  :value="searchText"
                  :placeholder="placeholder"
                  :disable-icon="!!selectedKey"
                  :is-focused.sync="isFocused"
        >
            <template #left="scope">
                <span v-for="(keyItem, idx) in selectedKeys" :key="idx" class="key-tag"
                      :class="{active: isFocused || visibleMenu}"
                >
                    {{ keyItem.label }}
                </span>
                <span v-if="operator" class="operator-tag">{{ operator }}</span>
            </template>
            <template #default="scope">
                <input ref="inputRef" v-focus.lazy="isFocused"
                       :value="searchText"
                       :placeholder="currentPlaceholder || scope.placeholder"
                       :type="inputElType"
                       :step="currentDataType === 'integer' ? 1 : undefined"
                       :min="currentDataType === 'integer' ? 0 : undefined"
                       @input="onInput"
                       @keyup.enter="onEnter"
                       @keydown="onKeydownCheck"
                       @click.stop="showMenu(true)"
                       @focus="focus"
                       @blur="blur"
                       @paste="onPaste"
                >
            </template>
            <template #right="scope">
                <div class="right">
                    <span v-if="selectedKey || scope.value" class="delete-btn" @click="onDeleteAll">
                        <p-i class="icon" name="ic_delete" height="1rem"
                             width="1rem"
                        />
                    </span>
                </div>
            </template>
            <template v-for="(_, slot) of searchSlots" v-slot:[slot]="scope">
                <slot :name="`search-${slot}`" v-bind="{...scope}" />
            </template>
        </p-search>
        <div v-show="visibleMenu" class="menu-container">
            <p-context-menu ref="menuRef"
                            :loading="lazyLoading"
                            :menu="menu"
                            @select="onMenuSelect"
                            @blur="focus"
            >
                <template #no-data>
                    <div />
                </template>
                <template v-for="(_, slot) of menuSlots" v-slot:[slot]="scope">
                    <slot :name="`menu-${slot}`" v-bind="{...scope}" />
                </template>
            </p-context-menu>
        </div>
    </div>
</template>

<script lang="ts">
import {
    computed, defineComponent, onMounted, onUnmounted, reactive, toRefs, watch, WatchStopHandle,
} from '@vue/composition-api';
import {
    throttle, reduce, cloneDeep, debounce,
} from 'lodash';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

/* Components, Directives */
import { focus as vFocus } from 'vue-focus';
import PI from '@/foundation/icons/PI.vue';

/* Types */
import {
    HandlerResponse,
    KeyItem,
    KeyMenuItem,
    operators,
    OperatorType,
    QuerySearchProps,
    ValueHandler,
    ValueItem,
    ValueMenuItem, MenuType, QueryItem, KeyDataType, OPERATOR,
} from '@/inputs/search/query-search/type';

/* Configs, Helpers */
import {
    defaultHandlerMap,
    formatterMap, inputTypeMap, inputValidatorMap, menuTypeMap,
    placeholderMap, supportOperatorMap,
} from '@/inputs/search/query-search/config';
import PSearch from '@/inputs/search/search/PSearch.vue';
import PContextMenu from '@/inputs/context-menu/PContextMenu.vue';
import {
    findKey,
    getRootKeyItemHandler, getKeyMenuForm,
    getValueMenuForm,
} from '@/inputs/search/query-search/helper';


dayjs.extend(utc);
dayjs.extend(timezone);

const ROOT_KEY_SETTER = ':';
const NUMBER_TYPES = ['integer', 'float'];

export default defineComponent({
    name: 'PQuerySearch',
    components: {
        PContextMenu,
        PSearch,
        PI,
    },
    directives: { focus: vFocus },
    model: {
        prop: 'value',
        event: 'update:value',
    },
    props: {
        value: {
            type: String,
            default: '',
        },
        placeholder: {
            type: String,
            default: undefined,
        },
        focused: {
            type: Boolean,
            default: false,
        },
        keyItemSets: {
            type: Array,
            default: () => [],
        },
        valueHandlerMap: {
            type: Object,
            default: () => ({}),
        },
    },
    setup(props: QuerySearchProps, { emit, slots }) {
        const state = reactive({
            /* Input */
            inputRef: null as null|HTMLElement,
            isFocused: props.focused,
            searchText: props.value,
            currentPlaceholder: computed(() => placeholderMap[state.currentDataType] || undefined),
            inputElType: computed(() => inputTypeMap[state.currentDataType] || 'text'),
            currentDataType: computed<KeyDataType|string>(() => {
                if (state.selectedKeys.length > 1) return state.handlerResp.dataType || '';
                if (state.rootKey) return state.rootKey.dataType || '';
                return '';
            }),

            /* Query */
            selectedKeys: [] as KeyItem[],
            subPath: computed<string|undefined>(() => state.selectedKeys.slice(1).map(d => d.name).join('.') || undefined),
            selectedKey: computed<KeyItem|null>(() => state.selectedKeys[state.selectedKeys.length - 1] || null),
            rootKey: computed<KeyItem|null>(() => state.selectedKeys[0] || null),
            operator: OPERATOR.contain as OperatorType,
            supportOperators: computed<OperatorType[]>(() => {
                if (state.handlerResp.operators) return state.handlerResp.operators;
                if (state.rootKey?.operators) return state.rootKey.operators;
                if (supportOperatorMap[state.currentDataType]) return supportOperatorMap[state.currentDataType];
                return operators;
            }),

            /* Menu */
            menuRef: null as any,
            visibleMenu: false,
            menuType: computed<MenuType>(() => {
                if (!state.rootKey) return 'ROOT_KEY';
                if (state.currentDataType === 'object') return 'KEY';
                return menuTypeMap[state.currentDataType] || 'VALUE';
            }),
            menu: [] as Array<KeyMenuItem|ValueMenuItem>,

            /* Handler */
            loading: false,
            lazyLoading: false,
            handler: computed<ValueHandler|null>(() => {
                if (state.menuType === 'ROOT_KEY') return getRootKeyItemHandler(props.keyItemSets);
                return defaultHandlerMap[state.currentDataType]
                    || props.valueHandlerMap[state.rootKey?.name as string]
                    || null;
            }),
            handlerResp: { results: [] } as HandlerResponse,


            /* help */
            visibleSearchGuide: false,
        });

        /* Control Input & Menu */
        const focus = () => { state.isFocused = true; };
        const blur = () => { state.isFocused = false; };
        const hideMenu = () => { state.visibleMenu = false; };
        const showMenu = async (refresh = false) => {
            state.visibleMenu = true;
            // eslint-disable-next-line no-use-before-define
            if (refresh) await updateMenuItems(state.searchText);
        };

        let offMenuFocusWatch: WatchStopHandle|undefined;
        const focusMenu = async (idx = 0) => {
            if (!state.visibleMenu) await showMenu(true);
            if (state.menuRef) state.menuRef.focus(idx);
            else {
                if (offMenuFocusWatch) offMenuFocusWatch();
                offMenuFocusWatch = watch(() => state.menuRef, (menuRef) => {
                    if (menuRef) {
                        menuRef.focus(idx);
                        if (offMenuFocusWatch) offMenuFocusWatch();
                    }
                });
            }
        };

        const leaveSearch = () => {
            blur();
            hideMenu();
        };

        const clearAll = () => {
            state.searchText = '';
            state.operator = OPERATOR.contain;
        };


        const updateSelectedKey = (item: KeyItem|null, replace = false) => {
            if (replace) {
                if (item) state.selectedKeys = [item];
                else state.selectedKeys = [];
            } else if (item) state.selectedKeys.push(item);
            else state.selectedKeys.pop();
        };

        const setMenu = (res: HandlerResponse) => {
            if (state.menuType === 'ROOT_KEY') state.menu = res.results;
            else if (state.menuType === 'KEY') state.menu = getKeyMenuForm(res, state.selectedKeys, state.subPath);
            else if (state.menuType === 'VALUE') state.menu = getValueMenuForm(res, state.selectedKeys, state.operator, state.subPath);
            else state.menu = res.results.map(d => ({ ...d, type: 'item', data: d }));
        };

        const updateLoader = debounce(() => {
            state.lazyLoading = state.loading;
        }, 500);
        const updateLoading = (value, force = false) => {
            state.loading = value;
            if (force) state.lazyLoading = value;
            else if (state.lazyLoading !== state.loading) updateLoader();
        };

        const updateMenuItems = throttle(async (inputText: string): Promise<void> => {
            let res: HandlerResponse = { results: [] };
            updateLoading(true);

            const input = NUMBER_TYPES.includes(state.currentDataType) ? Number(inputText) : inputText;
            if (state.handler) {
                const func = state.handler(input,
                    state.rootKey as KeyItem,
                    state.currentDataType,
                    state.subPath,
                    state.operator);
                if (func instanceof Promise) {
                    res = await func;
                } else {
                    res = func;
                }
            }

            state.handlerResp = res;
            setMenu(res);
            updateLoading(false, true);
        }, 150);


        const updateOperator = (operator?: OperatorType) => {
            if (operator === undefined) {
                if (state.operator.length === 2) state.operator = state.operator.substring(0, 1) as OperatorType;
                else state.operator = OPERATOR.contain;
            } else {
                state.operator = operator;
            }
        };


        const findAndSetKey = async (val: string, isRootKey = true) => {
            let item = findKey(val, state.handlerResp.results) || null;
            if (isRootKey) {
                if (item) {
                    clearAll();
                    focus();
                    updateSelectedKey(item, true);
                    await updateMenuItems(state.searchText);
                }
            } else {
                if (!item) item = { label: val, name: val };
                clearAll();
                focus();
                updateSelectedKey(item);
                await updateMenuItems(state.searchText);
            }
        };

        /* Event triggers */
        const emitSearch = (valueItem: ValueItem) => {
            let queryItem: QueryItem|null = {
                key: state.rootKey,
                value: valueItem,
                operator: state.operator,
            };

            if (formatterMap[state.rootKey?.dataType]) {
                queryItem = formatterMap[state.rootKey.dataType](cloneDeep(queryItem), state.currentDataType, state.subPath);
            }

            if (queryItem) {
                emit('search', queryItem);

                clearAll();
                if (state.selectedKey) updateSelectedKey(null, true);
                hideMenu();
            }
        };


        /* Event handlers */
        const onInput = async (e) => {
            const val = e.target.value === null || e.target.value === undefined ? '' : e.target.value;
            state.searchText = val;

            if (!state.visibleMenu) await showMenu();

            if (val.length > 1 && e.data === ROOT_KEY_SETTER && !state.rootKey) await findAndSetKey(val.slice(0, val.length - 1));
            else await updateMenuItems(val);
        };

        const onDelete = async (e) => {
            if (e.target.value) return;

            if (state.operator) {
                updateOperator();
                await updateMenuItems(state.searchText);
            } else if (state.selectedKey) {
                updateSelectedKey(null);
                await updateMenuItems('');
            }
        };

        const onEnter = async () => {
            if (state.currentDataType === 'object') {
                if (state.searchText) await findAndSetKey(state.searchText, false);
            } else if (state.rootKey) {
                if (state.searchText === '') emitSearch({ label: 'Null', name: null });
                else emitSearch({ label: state.searchText, name: state.searchText });
            } else if (state.searchText) emitSearch({ label: state.searchText, name: state.searchText });
        };

        const onKeydownCheck = async (e: KeyboardEvent) => {
            if (e.key === 'Backspace') {
                await onDelete(e);
                return;
            }
            if (e.key === 'ArrowDown' || e.key === 'Down') {
                await focusMenu();
                return;
            }
            if (e.key === 'ArrowUp' || e.key === 'Up') {
                await focusMenu(-1);
                return;
            }
            if (e.key === 'Escape' || e.key === 'Esc') {
                leaveSearch();
                return;
            }

            if (!state.selectedKey) return;

            /* check operator */
            if (state.searchText.length === 0) {
                const op = state.operator + e.key;
                if (state.supportOperators.some(d => d.startsWith(op))) {
                    e.preventDefault();
                    updateOperator(op as OperatorType);
                    await updateMenuItems(state.searchText);
                } else if (!state.supportOperators.includes(state.operator)) {
                    updateOperator('');
                    if (state.operator !== '') await updateMenuItems(state.searchText);
                }
            }

            /* value validation */
            if (inputValidatorMap[state.currentDataType]) {
                const validator = inputValidatorMap[state.currentDataType];
                if (!validator(e.key)) e.preventDefault();
            }
        };


        const getKeyItemsFromKeyText = (keyStr: string): KeyItem[] => {
            const allKeyItems = props.keyItemSets.map(d => d.items).flat();
            const dotIdx = keyStr.indexOf('.');
            let keyItems: KeyItem[] = [];

            if (dotIdx === -1) {
                const item = findKey(keyStr, allKeyItems);
                if (item) keyItems.push(item);
            } else {
                const item = findKey(keyStr.slice(0, dotIdx), allKeyItems);
                if (item?.dataType === 'object') {
                    keyItems = keyStr.split('.').map((d, i) => (i === 0 ? item : { label: d, name: d }));
                } else if (item) keyItems.push(item);
            }

            return keyItems;
        };

        const onPaste = (e: ClipboardEvent) => {
            if (state.selectedKeys.length > 0) return;

            const paste: string = (e.clipboardData || (window as any).clipboardData).getData('text');
            const text = (state.searchText + paste).trim().replace(/(\r\n|\n|\r)/gm, '');

            const separatorIdx = text.indexOf(':');
            if (separatorIdx === -1) {
                state.searchText = text;
            } else {
                const keyStr = text.slice(0, separatorIdx);
                const keyItems = getKeyItemsFromKeyText(keyStr);

                const value = text.slice(separatorIdx + 1);
                if (keyItems.length > 0) {
                    state.selectedKeys = keyItems;
                    state.searchText = value;
                    hideMenu();
                } else {
                    state.searchText = text;
                }
            }

            e.preventDefault();
        };

        const onDeleteAll = () => {
            updateSelectedKey(null, true);
            clearAll();
            focus();
        };

        const onMenuSelect = async (item: KeyMenuItem|ValueMenuItem) => {
            if (state.menuType === 'ROOT_KEY' || state.menuType === 'KEY') {
                hideMenu();
                updateSelectedKey(item.data as KeyItem);
                clearAll();
                focus();
                await showMenu(true);
            } else if (state.menuType === 'OPERATOR') {
                const operator = item.name as OperatorType;
                if (state.supportOperators.includes(operator)) {
                    updateOperator(operator);
                    focus();
                    hideMenu();
                }
            } else {
                if (!state.operator) state.operator = OPERATOR.equal;
                emitSearch(item.data as ValueItem);
            }
        };


        /* Help */
        const onHelpClick = () => {
            state.visibleSearchGuide = true;
        };

        /* Window Events Binding */
        const onWindowKeydown = (e: KeyboardEvent) => {
            if (state.visibleMenu && ['ArrowDown', 'ArrowUp'].includes(e.code)) {
                e.preventDefault();
            }
        };
        onMounted(() => {
            window.addEventListener('click', hideMenu);
            window.addEventListener('blur', hideMenu);
            window.addEventListener('keydown', onWindowKeydown, false);
        });
        onUnmounted(() => {
            window.removeEventListener('click', hideMenu);
            window.removeEventListener('blur', hideMenu);
            window.removeEventListener('keydown', onWindowKeydown, false);
        });


        /* Slots */
        const menuSlots = computed(() => reduce(slots, (res, d, name) => {
            if (name.startsWith('menu-') && !['menu-no-data'].includes(name)) {
                res[`${name.substring(5)}`] = d;
            }
            return res;
        }, {}));

        const searchSlots = computed(() => reduce(slots, (res, d, name) => {
            if (name.startsWith('search-') && !['search-left', 'search-default', 'search-right'].includes(name)) {
                res[`${name.substring(7)}`] = d;
            }
            return res;
        }, {}));

        return {
            ...toRefs(state),
            focus,
            blur,
            showMenu,
            hideMenu,
            updateMenuItems,
            emitSearch,
            onInput,
            onEnter,
            onKeydownCheck,
            onPaste,
            onDeleteAll,
            onMenuSelect,

            /* help */
            onHelpClick,

            /* slots */
            menuSlots,
            searchSlots,
        };
    },
});
</script>

<style lang="postcss">
.p-query-search {
    @apply w-full;
    .p-search {
        @apply text-sm font-normal;
    }
    .menu-container {
        @apply w-full relative;
    }
    .p-context-menu {
        @apply font-normal;
        max-width: 100%;
        position: absolute;
        margin-top: -1px;
        z-index: 1000;
        min-width: auto;
        width: auto;
    }
    &.no-menu .p-context-menu {
        border-width: 0;
    }
    .key-tag {
        @apply bg-gray-200 rounded-sm px-2 text-xs mr-2;
        height: 1.125rem;
        line-height: 1.125rem;
        &.active {
            @apply bg-blue-300;
        }
    }
    .operator-tag {
        @apply mr-2;
        height: 1.125rem;
        line-height: 1.125rem;
    }
    .right {
        display: inline-flex;
        justify-content: space-between;
        align-items: center;
        .delete-btn {
            @apply cursor-pointer inline-block flex-shrink-0 rounded-full;
            position: relative;
            height: 1rem;
            width: 1rem;
            &:hover {
                @apply bg-gray-200;
            }
            .icon {
                position: absolute;
            }
        }
    }
}
</style>
