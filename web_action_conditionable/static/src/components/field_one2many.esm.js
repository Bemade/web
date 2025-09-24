/** @odoo-module **/
import { X2ManyField } from "@web/views/fields/x2many/x2many_field";
import { evaluateExpr } from "@web/core/py_js/py";
import { patch } from "@web/core/utils/patch";

const X2M_PROTOTYPE = X2ManyField.prototype;

if (!Object.prototype.hasOwnProperty.call(X2M_PROTOTYPE, "_wac_originalRendererProps")) {
    Object.defineProperty(X2M_PROTOTYPE, "_wac_originalRendererProps", {
        value: Object.getOwnPropertyDescriptor(X2M_PROTOTYPE, "rendererProps")?.get,
        writable: false,
        configurable: true,
    });
}

const originalRendererPropsGetter = X2M_PROTOTYPE._wac_originalRendererProps;

patch(X2ManyField.prototype, {
    get rendererProps() {
        this._updateConditionalActions();
        return originalRendererPropsGetter ? originalRendererPropsGetter.call(this) : undefined;
    },
    _updateConditionalActions() {
        if (
            this.props.viewMode !== "list" ||
            !this.activeActions ||
            this.activeActions.type !== "one2many"
        ) {
            return;
        }

        const archNode = this.archInfo?.xmlDoc;
        if (!archNode) {
            return;
        }

        const targetNode =
            archNode.tagName === "list"
                ? archNode
                : archNode.tagName === "tree"
                  ? archNode
                  : archNode.querySelector("list, tree");

        if (!targetNode) {
            return;
        }

        const evalContext = {
            ...(this.props.record.evalContext || {}),
            ...(this.props.record.data || {}),
        };

        for (const actionName of ["create", "delete"]) {
            if (!Object.prototype.hasOwnProperty.call(this.activeActions, actionName)) {
                continue;
            }
            if (!targetNode.hasAttribute(actionName)) {
                continue;
            }
            const expr = targetNode.getAttribute(actionName);
            try {
                this.activeActions[actionName] = Boolean(evaluateExpr(expr, evalContext));
            } catch (error) {
                console.warn(
                    `[web_action_conditionable] unrecognized expr '${expr}', ignoring`,
                    error
                );
            }
        }
    },
});
