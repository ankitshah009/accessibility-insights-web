// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AndroidSetupStepConfig } from 'electron/platform/android/setup/android-setup-steps-configs';

export const detectDevices: AndroidSetupStepConfig = deps => {
    return {
        actions: {
            cancel: () => {
                deps.stepTransition('prompt-connect-to-device');
            },
        },
        onEnter: async () => {
            const devices = await deps.getDevices();

            switch (devices.length) {
                case 0: {
                    deps.stepTransition('prompt-connect-to-device');
                    break;
                }
                case 1: {
                    deps.setSelectedDeviceId(devices[0].id);
                    deps.stepTransition('detect-service');
                    break;
                }
                default: {
                    deps.stepTransition('prompt-choose-device');
                    break;
                }
            }
        },
    };
};
