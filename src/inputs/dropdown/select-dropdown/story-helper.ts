import { camelCase } from 'lodash';
import { ArgTypes } from '@storybook/addons';
import { menuItems } from '@/inputs/context-menu/mock';
import { getContextMenuArgTypes } from '@/inputs/context-menu/story-helper';
import { BUTTON_STYLE } from '@/inputs/buttons/button/type';
import { SELECT_DROPDOWN_TYPE, CONTEXT_MENU_POSITION } from '@/inputs/dropdown/select-dropdown/type';

export const getSelectDropdownArgTypes = (): ArgTypes => {
    const contextMenuArgTypes = getContextMenuArgTypes();

    const contextMenuSlots = {};
    Object.keys(contextMenuArgTypes).forEach((k) => {
        const argType = contextMenuArgTypes[k];
        if (argType.table?.category === 'slots') {
            argType.name = `menu-${argType.name}`;
            contextMenuSlots[`menu${camelCase(k)}`] = argType;
        }
    });
    return {
        /* context menu fixed style props */
        useFixedMenuStyle: {
            name: 'useFixedMenuStyle',
            type: { name: 'boolean' },
            description: 'Whether to use position fixed style on menu or not. ',
            defaultValue: false,
            table: {
                type: {
                    summary: 'boolean',
                },
                category: 'props',
                defaultValue: {
                    summary: 'false',
                },
            },
            control: {
                type: 'boolean',
            },
        },
        visibleMenu: {
            name: 'visibleMenu',
            type: { name: 'boolean' },
            description: 'Whether to show the menu or not. Automatically determined if no value is given. `sync` props.',
            defaultValue: undefined,
            table: {
                type: {
                    summary: 'boolean',
                },
                category: 'props',
                defaultValue: {
                    summary: 'undefined',
                },
            },
            control: {
                type: null,
            },
        },
        //
        invalid: contextMenuArgTypes.invalid,
        loading: contextMenuArgTypes.loading,
        items: {
            name: 'items',
            type: { name: 'array' },
            description: 'Dropdown menu items. It is the same as the menu format of the context menu component.',
            defaultValue: menuItems,
            table: {
                type: {
                    summary: 'array',
                },
                category: 'props',
                defaultValue: {
                    summary: '[]',
                },
            },
            control: {
                type: 'object',
            },
        },
        selected: {
            name: 'selected',
            type: { name: 'string, number' },
            description: 'Selected item\'s name or index(when `indexMode` props is `true`. Two way binding with `sync` is available.',
            defaultValue: undefined,
            table: {
                type: {
                    summary: 'string, number',
                },
                category: 'props',
                defaultValue: {
                    summary: 'undefined',
                },
            },
            control: {
                type: 'object',
            },
        },
        disabled: {
            name: 'disabled',
            type: { name: 'boolean' },
            description: 'Whether to disable dropdown selection or not.',
            defaultValue: false,
            table: {
                type: {
                    summary: 'boolean',
                },
                category: 'props',
                defaultValue: {
                    summary: 'false',
                },
            },
            control: {
                type: 'boolean',
            },
        },
        indexMode: {
            name: 'indexMode',
            type: { name: 'boolean' },
            description: 'Whether to `selected` props works with item\'s index or not.',
            defaultValue: false,
            table: {
                type: {
                    summary: 'boolean',
                },
                category: 'props',
                defaultValue: {
                    summary: 'false',
                },
            },
            control: {
                type: 'boolean',
            },
        },
        placeholder: {
            name: 'placeholder',
            type: { name: 'string' },
            description: 'Placeholder for dropdown button.',
            defaultValue: '',
            table: {
                type: {
                    summary: 'string',
                },
                category: 'props',
                defaultValue: {
                    summary: '""',
                },
            },
            control: {
                type: 'text',
            },
        },
        withoutOutline: {
            name: 'withoutOutline',
            type: { name: 'boolean' },
            description: 'Whether to show outline or not. Useful when `type` props is `default`.',
            defaultValue: false,
            table: {
                type: {
                    summary: 'boolean',
                },
                category: 'props',
                defaultValue: {
                    summary: 'false',
                },
            },
            control: {
                type: 'boolean',
            },
        },
        readOnly: {
            name: 'readOnly',
            type: { name: 'boolean' },
            description: 'Whether to make readonly or not.',
            defaultValue: false,
            table: {
                type: {
                    summary: 'boolean',
                },
                category: 'props',
                defaultValue: {
                    summary: 'false',
                },
            },
            control: {
                type: 'boolean',
            },
        },
        type: {
            name: 'type',
            type: { name: 'string' },
            description: `Select dropdown Types. ${
                [...Object.values(SELECT_DROPDOWN_TYPE)].map(d => `\`${d}\``)} are available.`,
            defaultValue: SELECT_DROPDOWN_TYPE.DEFAULT,
            table: {
                type: {
                    summary: 'string',
                },
                category: 'props',
                defaultValue: {
                    summary: 'default',
                },
            },
            control: {
                type: 'select',
                options: [undefined, ...Object.values(SELECT_DROPDOWN_TYPE)],
            },
        },
        buttonStyleType: {
            name: 'buttonStyleType',
            type: { name: 'string' },
            description: 'Button style types. Useful when `type` props is `button` or `outline-button`,`buttonStyleType` props can be applied.',
            defaultValue: 'primary-dark',
            table: {
                type: {
                    summary: 'string',
                },
                category: 'props',
                defaultValue: {
                    summary: 'primary-dark',
                },
            },
            control: {
                type: 'select',
                options: [undefined, ...Object.values(BUTTON_STYLE)],
            },
        },
        buttonIcon: {
            name: 'buttonIcon',
            type: { name: 'string' },
            description: 'Icons for dropdown right button. Useful when `type` props is `icon-button`.',
            defaultValue: undefined,
            table: {
                type: {
                    summary: 'string',
                },
                category: 'props',
                defaultValue: {
                    summary: 'undefined',
                },
            },
            control: {
                type: 'text',
            },
        },
        menuPosition: {
            name: 'menuPosition',
            type: { name: 'string' },
            description: 'Position of Context menu',
            defaultValue: CONTEXT_MENU_POSITION.RIGHT,
            table: {
                type: {
                    summary: 'string',
                },
                category: 'props',
                defaultValue: {
                    summary: CONTEXT_MENU_POSITION.RIGHT,
                },
            },
            control: {
                type: 'select',
                options: [...Object.values(CONTEXT_MENU_POSITION)],
            },
        },
        /* model */
        'v-model': {
            name: 'v-model',
            type: { name: 'string, number' },
            description: 'Two way binding for `selected` props with `update:selected` event.',
            defaultValue: undefined,
            table: {
                type: {
                    summary: 'string, number',
                },
                category: 'model',
                defaultValue: {
                    summary: 'undefined',
                },
            },
            control: null,
        },
        /* slots */
        ...contextMenuSlots,
        defaultSlot: {
            name: 'default',
            description: 'Slot for dropdown button text. Default value is placeholder or selected item\'s label.',
            defaultValue: null,
            table: {
                type: {
                    summary: null,
                },
                defaultValue: {
                    summary: null,
                },
                category: 'slots',
            },
        },
        /* events */
        onSelect: {
            name: 'select',
            description: 'Event emitted when menu item was selected.',
            table: {
                type: {
                    summary: null,
                },
                defaultValue: {
                    summary: null,
                },
                category: 'events',
            },
        },
        onUpdateSelected: {
            name: 'update:selected',
            description: 'Event emitted when menu item was selected. works with `selected` props sync.',
            table: {
                type: {
                    summary: null,
                },
                defaultValue: {
                    summary: null,
                },
                category: 'events',
            },
        },
        onFocusMenu: {
            name: 'focus-menu',
            description: 'Event emitted when menu must be focused, but there are no menu items to focus because `menu-menu` slot was given.',
            table: {
                type: {
                    summary: null,
                },
                defaultValue: {
                    summary: null,
                },
                category: 'events',
            },
        },
    };
};
