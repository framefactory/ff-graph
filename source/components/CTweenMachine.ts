/**
 * 3D Foundation Project
 * Copyright 2018 Smithsonian Institution
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { getEasingFunction, EEasingCurve } from "@ff/core/easing";

import Component, { types } from "../Component";
import Property from "../Property";
import { IPulseContext } from "./CPulse";
import { Dictionary } from "@ff/core/types";
import clone from "@ff/core/clone";

////////////////////////////////////////////////////////////////////////////////

export { EEasingCurve };

export interface IMachineState
{
    states?: ITweenState[];
    targets?: ITweenTarget[];
}

export interface ITweenTarget
{
    id: string;
    key: string;
    isNumber?: boolean;
    isArray?: boolean;
}

export interface ITweenState
{
    id: string;
    title: string;
    values: any[];
    duration: number;
    curve: EEasingCurve;
    threshold: number;
}

export default class CTweenMachine extends Component
{
    static readonly typeName: string = "CTweenMachine";

    protected static readonly ins = {
        stateSelect: types.Option("Machine.States", []),
        save: types.Event("Control.Save"),
        load: types.Event("Control.Load"),
        tween: types.Event("Control.Tween"),
        delete: types.Event("Control.Delete"),
        id: types.String("State.Id"),
        title: types.String("State.Title"),
        duration: types.Number("Tween.Duration", 1),
        curve: types.Enum("Tween.Curve", EEasingCurve),
        threshold: types.Percent("Tween.Threshold", 0.5),
    };

    protected static readonly outs = {
        id: types.String("State.Id"),
        title: types.String("State.Title"),
        tweening: types.Boolean("Tween.IsTweening"),
        time: types.Number("Tween.Time"),
        completed: types.Percent("Tween.Completed"),
        switched: types.Boolean("Tween.Switched"),
    };

    ins = this.addInputs(CTweenMachine.ins);
    outs = this.addOutputs(CTweenMachine.outs);

    private _targets: ITweenTarget[] = [];
    private _states: Dictionary<ITweenState> = {};

    private _currentValues: any[] = null;
    private _targetState: ITweenState = null;
    private _startTime = 0;
    private _easingFunction = null;

    create()
    {
        this.updateStateList();
    }

    update(context: IPulseContext)
    {
        const ins = this.ins;

        if (ins.stateSelect.changed) {
            const id = ins.stateSelect.getOptionText();
            const state = this._states[id];
            if (state) {
                ins.id.setValue(id);
            }
        }

        const stateId = ins.id.value;

        if (ins.save.changed && stateId) {
            const state = this._states[stateId] = {
                id: stateId,
                title: ins.title.value,
                values: this.getValues(),
                duration: ins.duration.value,
                curve: ins.curve.getValidatedValue(),
                threshold: ins.threshold.value,
            };
            this.updateStateList();
            this.setCurrentState(state);
        }
        if (ins.load.changed && stateId) {
            const state = this._states[stateId];
            if (state) {
                ins.title.setValue(state.title);
                ins.duration.setValue(state.duration);
                ins.curve.setValue(state.curve);
                ins.threshold.setValue(state.threshold);

                this.setCurrentState(state);
                this.setValues(state.values);
            }
        }
        if (ins.tween.changed && stateId) {
            const state = this._states[stateId];
            if (state) {
                this._currentValues = this.getValues();
                this._targetState = state;
                this._startTime = context.secondsElapsed;
                this._easingFunction = getEasingFunction(state.curve);
                this.outs.switched.setValue(false);
                this.outs.tweening.setValue(true);

                this.setCurrentState(state);
            }
        }
        if (ins.delete.changed && stateId) {
            delete this._states[stateId];
            this.updateStateList();
        }

        return true;
    }

    tick(context: IPulseContext)
    {
        const targetState = this._targetState;
        if (!targetState) {
            return false;
        }

        const outs = this.outs;

        const currentValues = this._currentValues;
        const startTime = this._startTime;
        const tweenTime = context.secondsElapsed - startTime;
        const tweenFactor = tweenTime / targetState.duration;

        if (tweenFactor < 1) {
            const easeFactor = this._easingFunction(tweenFactor);
            const shouldSwitch = tweenFactor >= targetState.threshold && !outs.switched.value;

            this.setValues(currentValues, targetState.values, easeFactor, shouldSwitch);

            outs.time.setValue(tweenTime);
            outs.completed.setValue(tweenFactor);
            if (shouldSwitch) {
                outs.switched.setValue(true);
            }
        }
        else {
            this.setValues(currentValues, targetState.values, 1, !outs.switched.value);

            outs.tweening.setValue(false);
            outs.time.setValue(targetState.duration);
            outs.completed.setValue(1);
            outs.switched.setValue(true);

            this._currentValues = null;
            this._targetState = null;
            this._startTime = 0;
            this._easingFunction = null;
        }

        return true;
    }

    inflate(json: any)
    {
        if (json.state) {
            this.inflateState(json.state);
        }

        super.inflate(json);
    }

    inflateState(json: IMachineState)
    {
        if (json.targets) {
            this._targets = json.targets.map(jsonTarget => {
                const property = this.getProperty(jsonTarget.id, jsonTarget.key);
                return {
                    id: jsonTarget.id,
                    key: jsonTarget.key,
                    isNumber: !!property && property.type === "number",
                    isArray: !!property && property.isArray(),
                };
            });
        }
        if (json.states) {
            this._states = {};
            json.states.forEach(state => {
                this._states[state.id] = state;
            });
        }
    }

    deflate(): any
    {
        const json = super.deflate();

        const state = this.deflateState();
        if (state) {
            json.state = state;
        }

        return json;
    }

    deflateState(): IMachineState
    {
        const json: IMachineState = {};

        const targets = this._targets;
        if (targets.length > 0) {
            json.targets = targets.map(target => ({ id: target.id, key: target.key }));
        }
        const stateIds = Object.keys(this._states);
        if (stateIds.length > 0) {
            json.states = stateIds.map(id => {
                return clone(this._states[id]);
            });
        }

        return json;
    }

    addTarget(component: Component, property: Property)
    {
        if (this.hasTarget(component, property)) {
            throw new Error("can't add, target already exists");
        }
        if (property.type === "object") {
            throw new Error("can't add, property is of type object");
        }

        const id = component.id;
        const key = property.key;

        const isNumber = property.type === "number";
        const isArray = property.isArray();

        this._targets.push({ id, key, isNumber, isArray });

        const states = this._states;
        const keys = Object.keys(states);
        for (let i = 0, n = keys.length; i < n; ++i) {
            states[keys[i]].values.push(undefined);
        }
        if (this._currentValues) {
            this._currentValues.push(undefined);
        }
    }

    removeTarget(component: Component, property: Property)
    {
        const target = this.getTarget(component, property);

        if (!target) {
            throw new Error("can't remove, target doesn't exist");
        }

        const index = this._targets.indexOf(target);

        this._targets.splice(index, 1);

        const states = this._states;
        const keys = Object.keys(states);
        for (let i = 0, n = keys.length; i < n; ++i) {
            states[keys[i]].values.splice(index, 1);
        }
        if (this._currentValues) {
            this._currentValues.splice(index, 1);
        }
    }

    hasTarget(component: Component, property: Property)
    {
        return !!this.getTarget(component, property);
    }

    getTarget(component: Component, property: Property)
    {
        const componentId = component.id;
        const propertyKey = property.key;

        return this._targets.find(
            target => target.id === componentId && target.key === propertyKey
        );
    }

    protected updateStateList()
    {
        const keys = Object.keys(this._states);
        if (keys.length === 0) {
            keys.push("(none)");
        }

        this.ins.stateSelect.setOptions(keys);
    }

    protected setCurrentState(state: ITweenState)
    {
        const index = Object.keys(this._states).indexOf(state.id);
        if (index >= 0) {
            this.ins.stateSelect.setValue(index);
        }

        const outs = this.outs;
        outs.id.setValue(state.id);
        outs.title.setValue(state.title);
    }

    protected getProperty(componentId: string, propertyKey: string): Property | undefined
    {
        const component = this.system.components.getById(componentId);
        if (!component) {
            return null;
        }

        return component.ins[propertyKey];
    }

    protected setValues(valuesA: any[]);
    protected setValues(valuesA: any[], valuesB: any[], factor: number, doSwitch: boolean)
    protected setValues(valuesA: any[], valuesB?: any[], factor?: number, doSwitch?: boolean)
    {
        const targets = this._targets;

        for (let i = 0, n = targets.length; i < n; ++i) {
            const target = targets[i];

            const property = this.getProperty(target.id, target.key);
            if (!property) {
                continue;
            }

            if (target.isNumber && valuesB) {
                const vA = valuesA[i];
                const vB = valuesB[i];
                if (target.isArray) {
                    let changed = false;
                    for (let i = 0, n = vA.length; i < n; ++i) {
                        const v = vA[i] + factor * (vB[i] - vA[i]);
                        changed = property.value[i] !== v || changed;
                        property.value[i] = v;
                    }
                    if (changed) {
                        property.set();
                    }
                } else {
                    const v = vA + factor * (vB - vA);
                    if (v !== property.value) {
                        property.setValue(v);
                    }
                }
            }
            else if (!valuesB || doSwitch) {
                const value = valuesB ? valuesB[i] : valuesA[i];

                if (target.isArray) {
                    let changed = false;
                    for (let i = 0, n = value.length; i < n; ++i) {
                        changed = property.value[i] !== value[i] || changed;
                        property.value[i] = value[i];
                    }
                    if (changed) {
                        property.set();
                    }
                }
                else if (value !== property.value) {
                    property.setValue(value);
                }
            }
        }
    }

    protected getValues(): any[]
    {
        const values = [];
        const targets = this._targets;
        for (let i = 0, n = targets.length; i < n; ++i) {
            const target = targets[i];
            const property = this.getProperty(target.id, target.key);
            values.push(property ? property.cloneValue() : undefined);
        }

        return values;
    }
}