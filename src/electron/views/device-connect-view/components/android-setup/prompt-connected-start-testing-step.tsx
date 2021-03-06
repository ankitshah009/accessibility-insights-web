// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { NamedFC } from 'common/react/named-fc';
import {
    DeviceDescription,
    DeviceDescriptionProps,
} from 'electron/views/device-connect-view/components/android-setup/device-description';
import * as styles from 'electron/views/device-connect-view/components/android-setup/prompt-connected-start-testing-step.scss';
import { Button } from 'office-ui-fabric-react';
import * as React from 'react';

import { AndroidSetupStepLayout, AndroidSetupStepLayoutProps } from './android-setup-step-layout';
import { CommonAndroidSetupStepProps } from './android-setup-types';

export const PromptConnectedStartTestingStep = NamedFC<CommonAndroidSetupStepProps>(
    'PromptConnectedStartTestingStep',
    (props: CommonAndroidSetupStepProps) => {
        const { LinkComponent } = props.deps;

        const onRescanButton = () => {
            // To be implemented in future feature work
            console.log(`androidSetupActionCreator.rescanDevices()`);
        };

        const layoutProps: AndroidSetupStepLayoutProps = {
            headerText: 'Connected and ready to go!',
            moreInfoLink: (
                <LinkComponent href="https://aka.ms/accessibility-insights-for-android/otherDevice">
                    How do I connect a different device?
                </LinkComponent>
            ),
            leftFooterButtonProps: {
                text: 'Cancel',
                onClick: props.deps.androidSetupActionCreator.cancel,
            },
            rightFooterButtonProps: {
                text: 'Start testing',
                disabled: false,
                onClick: props.deps.startTesting,
            },
        };

        const descriptionProps: DeviceDescriptionProps = {
            ...props.androidSetupStoreData.selectedDevice,
            className: styles.deviceDescription,
        };

        return (
            <AndroidSetupStepLayout {...layoutProps}>
                <DeviceDescription {...descriptionProps}></DeviceDescription>
                <Button
                    className={styles.rescanButton}
                    text="Rescan devices"
                    onClick={onRescanButton}
                />
            </AndroidSetupStepLayout>
        );
    },
);
