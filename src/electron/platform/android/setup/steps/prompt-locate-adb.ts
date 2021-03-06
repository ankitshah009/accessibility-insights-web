// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AndroidSetupStepConfig } from 'electron/platform/android/setup/android-setup-steps-configs';

export const promptLocateAdb: AndroidSetupStepConfig = deps => {
    return {
        actions: {
            saveAdbPath: (path: string) => {
                deps.setAdbPath(path);
                deps.stepTransition('prompt-connect-to-device');
            },
        },
    };
};
