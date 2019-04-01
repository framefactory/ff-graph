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
    values: any[];
    name: string;
    duration: number;
    curve: EEasingCurve;
    threshold: number;
}

export default class CTweenMachine extends Component
{
    static readonly typeName: string = "CTweenMachine";

    protected static readonly ins = {
        index: types.Integer("Control.Index"),
        next: types.Event("Control.Next"),
        previous: types.Event("Control.Previous"),
        first: types.Event("Control.First"),
        tween: types.Boolean("Control.Tween", true),
        loop: types.Boolean("Control.Loop", true),
    };

    protected static readonly outs = {
        count: types.Integer("States.Count"),
        index: types.Integer("States.Index"),
        tweening: types.Boolean("Control.IsTweening"),
        time: types.Number("Control.Time"),
        completed: types.Percent("Control.Completed"),
        switched: types.Boolean("Control.Switched"),
        start: types.Event("Control.Start"),
        switch: types.Event("Control.Switch"),
        end: types.Event("Control.End"),
    };

    ins = this.addInputs(CTweenMachine.ins);
    outs = this.addOutputs(CTweenMachine.outs);

    private _targets: ITweenTarget[] = [];
    private _states: ITweenState[] = [];

    private _currentValues: any[] = null;
    private _targetState: ITweenState = null;
    private _startTime = 0;
    private _easingFunction = null;

    get states() {
        return this._states;
    }

    update(context: IPulseContext)
    {
        const ins = this.ins;
        const outs = this.outs;

        const states = this._states;
        let index = this.ins.index.value;
        index = Math.min(states.length - 1, Math.max(0, index));

        if (index === -1) {
            outs.index.setValue(-1);
            return true;
        }

        let targetIndex = index;

        if (ins.index.changed) {
            targetIndex = Math.max(-1, Math.min(states.length - 1, ins.index.value));
        }
        if (ins.next.changed) {
            targetIndex = ins.loop.value ? (index + 1) % states.length : index + 1;
        }
        else if (ins.previous.changed) {
            targetIndex = ins.loop.value ? (index + states.length - 1) % states.length : index - 1;
        }
        else if (ins.first.changed) {
            targetIndex = 0;
        }

        if (targetIndex !== outs.index.value) {
            outs.index.setValue(targetIndex);
            const targetState = states[targetIndex];

            if (ins.tween.value) {
                this._targetState = targetState;
                this._currentValues = this.getCurrentValues();
                this._startTime = context.secondsElapsed;
                this._easingFunction = getEasingFunction(targetState.curve);
                outs.switched.setValue(false);
                outs.tweening.setValue(true);
                outs.start.set();
            }
            else {
                this.setValues(targetState.values);
            }

            return true;
        }

        return false;
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
                outs.switch.set();
            }
        }
        else {
            this.setValues(currentValues, targetState.values, 1, !outs.switched.value);

            outs.tweening.setValue(false);
            outs.time.setValue(targetState.duration);
            outs.completed.setValue(1);
            outs.end.set();

            if (!outs.switched.value) {
                outs.switched.setValue(true);
            }

            this._currentValues = null;
            this._targetState = null;
            this._startTime = 0;
            this._easingFunction = null;
        }

        return true;
    }

    fromJSON(json: any)
    {
        if (json.state) {
            this.stateFromJSON(json.state);
        }

        super.fromJSON(json);
    }

    stateFromJSON(json: IMachineState)
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
            this._states = json.states.slice();
        }

        this._startTime = 0;
        this.ins.index.setValue(0);
        this.emit("list-update");
    }

    toJSON(): any
    {
        const json = super.toJSON();

        const state = this.stateToJSON();
        if (state) {
            json.state = state;
        }

        return json;
    }

    stateToJSON(): IMachineState
    {
        const json: IMachineState = {};

        const targets = this._targets;
        if (targets.length > 0) {
            json.targets = targets.map(target => ({ id: target.id, key: target.key }));
        }

        const states = this._states;
        if (states.length > 0) {
            json.states = states.slice();
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

    getCurrentValues(): any[]
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