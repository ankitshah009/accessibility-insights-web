// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as React from 'react';

import * as Markup from '../../markup';
import { link } from '../../../content/link';
import ManualTestRecordYourResults from '../../common/manual-test-record-your-results';
import { TestStep } from '../../types/test-step';
import { SemanticsTestStep } from './test-steps';

const emphasisDescription: JSX.Element = (
    <span>Words and phrases that are visually emphasized must be contained within semantically correct containers.</span>
);

const emphasisHowToTest: JSX.Element = (
    <div>
        <p>This procedure uses the Chrome Developer Tools (F12) to inspect the page's HTML.</p>
        <ol>
            <li>Examine the target page to identify any visually emphasized words or phrases.</li>
            <li>
                Inspect the HTML for each emphasized word or phrase to verify that it's contained in an <Markup.Tag tagName="em" /> or{' '}
                <Markup.Tag tagName="strong" /> element.
            </li>
            <ManualTestRecordYourResults isMultipleFailurePossible={true} />
        </ol>
    </div>
);

export const SemanticsEmphasis: TestStep = {
    key: SemanticsTestStep.emphasis,
    name: 'Emphasis',
    description: emphasisDescription,
    howToTest: emphasisHowToTest,
    isManual: true,
    guidanceLinks: [link.WCAG_1_3_1],
    updateVisibility: false,
};