// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AppInsights } from 'applicationinsights-js';
import axios from 'axios';
import { CardSelectionActionCreator } from 'background/actions/card-selection-action-creator';
import { CardSelectionActions } from 'background/actions/card-selection-actions';
import { ContentActions } from 'background/actions/content-actions';
import { DetailsViewActionCreator } from 'background/actions/details-view-action-creator';
import { DetailsViewActions } from 'background/actions/details-view-actions';
import { FeatureFlagActions } from 'background/actions/feature-flag-actions';
import { PreviewFeaturesActions } from 'background/actions/preview-features-actions';
import { SidePanelActions } from 'background/actions/side-panel-actions';
import { UnifiedScanResultActions } from 'background/actions/unified-scan-result-actions';
import { FeatureFlagsController } from 'background/feature-flags-controller';
import { FeatureFlagsActionCreator } from 'background/global-action-creators/feature-flags-action-creator';
import { IssueFilingActionCreator } from 'background/global-action-creators/issue-filing-action-creator';
import { registerUserConfigurationMessageCallback } from 'background/global-action-creators/registrar/register-user-configuration-message-callbacks';
import { UserConfigurationActionCreator } from 'background/global-action-creators/user-configuration-action-creator';
import { Interpreter } from 'background/interpreter';
import { IssueDetailsTextGenerator } from 'background/issue-details-text-generator';
import { CardSelectionStore } from 'background/stores/card-selection-store';
import { DetailsViewStore } from 'background/stores/details-view-store';
import { FeatureFlagStore } from 'background/stores/global/feature-flag-store';
import { UnifiedScanResultStore } from 'background/stores/unified-scan-result-store';
import { ConsoleTelemetryClient } from 'background/telemetry/console-telemetry-client';
import { UserConfigurationController } from 'background/user-configuration-controller';
import { provideBlob } from 'common/blob-provider';
import { allCardInteractionsSupported } from 'common/components/cards/card-interaction-support';
import { ExpandCollapseVisualHelperModifierButtons } from 'common/components/cards/cards-visualization-modifier-buttons';
import { CardsCollapsibleControl } from 'common/components/cards/collapsible-component-cards';
import { FixInstructionProcessor } from 'common/components/fix-instruction-processor';
import { getPropertyConfiguration } from 'common/configs/unified-result-property-configurations';
import { config } from 'common/configuration';
import { DateProvider } from 'common/date-provider';
import { DocumentManipulator } from 'common/document-manipulator';
import { DropdownClickHandler } from 'common/dropdown-click-handler';
import { TelemetryEventSource } from 'common/extension-telemetry-events';
import { FeatureFlagDefaultsHelper } from 'common/feature-flag-defaults-helper';
import { FileURLProvider } from 'common/file-url-provider';
import { getCardSelectionViewData } from 'common/get-card-selection-view-data';
import { GetGuidanceTagsFromGuidanceLinks } from 'common/get-guidance-tags-from-guidance-links';
import { isResultHighlightUnavailableUnified } from 'common/is-result-highlight-unavailable';
import { createDefaultLogger } from 'common/logging/default-logger';
import { CardSelectionMessageCreator } from 'common/message-creators/card-selection-message-creator';
import { DropdownActionMessageCreator } from 'common/message-creators/dropdown-action-message-creator';
import { IssueFilingActionMessageCreator } from 'common/message-creators/issue-filing-action-message-creator';
import { UserConfigMessageCreator } from 'common/message-creators/user-config-message-creator';
import { NavigatorUtils } from 'common/navigator-utils';
import { getCardViewData } from 'common/rule-based-view-model-provider';
import { TelemetryDataFactory } from 'common/telemetry-data-factory';
import { WindowUtils } from 'common/window-utils';
import { DetailsViewActionMessageCreator } from 'DetailsView/actions/details-view-action-message-creator';
import { CardsViewDeps } from 'DetailsView/components/cards-view';
import { ipcRenderer, shell } from 'electron';
import { DirectActionMessageDispatcher } from 'electron/adapters/direct-action-message-dispatcher';
import { NullDetailsViewController } from 'electron/adapters/null-details-view-controller';
import { NullStoreActionMessageCreator } from 'electron/adapters/null-store-action-message-creator';
import { createGetToolDataDelegate } from 'electron/common/application-properties-provider';
import { getAllFeatureFlagDetailsUnified } from 'electron/common/unified-feature-flags';
import { AndroidSetupActionCreator } from 'electron/flux/action-creator/android-setup-action-creator';
import { ScanActionCreator } from 'electron/flux/action-creator/scan-action-creator';
import { WindowFrameActionCreator } from 'electron/flux/action-creator/window-frame-action-creator';
import { WindowStateActionCreator } from 'electron/flux/action-creator/window-state-action-creator';
import { AndroidSetupActions } from 'electron/flux/action/android-setup-actions';
import { ScanActions } from 'electron/flux/action/scan-actions';
import { WindowFrameActions } from 'electron/flux/action/window-frame-actions';
import { WindowStateActions } from 'electron/flux/action/window-state-actions';
import { AndroidSetupStore } from 'electron/flux/store/android-setup-store';
import { ScanStore } from 'electron/flux/store/scan-store';
import { WindowStateStore } from 'electron/flux/store/window-state-store';
import { IpcMessageReceiver } from 'electron/ipc/ipc-message-receiver';
import { IpcRendererShim } from 'electron/ipc/ipc-renderer-shim';
import { createDeviceConfigFetcher } from 'electron/platform/android/device-config-fetcher';
import { createScanResultsFetcher } from 'electron/platform/android/fetch-scan-results';
import { ScanController } from 'electron/platform/android/scan-controller';
import { AndroidSetupDeps } from 'electron/platform/android/setup/android-setup-deps';
import { createAndroidSetupStateMachineFactory } from 'electron/platform/android/setup/android-setup-state-machine-factory';
import { createDefaultBuilder } from 'electron/platform/android/unified-result-builder';
import { UnifiedSettingsProvider } from 'electron/settings/unified-settings-provider';
import { defaultAndroidSetupComponents } from 'electron/views/device-connect-view/components/android-setup/default-android-setup-components';
import { UnifiedReportNameGenerator } from 'electron/views/report/unified-report-name-generator';
import { UnifiedReportSectionFactory } from 'electron/views/report/unified-report-section-factory';
import { RootContainerState } from 'electron/views/root-container/components/root-container';
import { PlatformInfo } from 'electron/window-management/platform-info';
import { WindowFrameListener } from 'electron/window-management/window-frame-listener';
import { WindowFrameUpdater } from 'electron/window-management/window-frame-updater';
import { createIssueDetailsBuilderForUnified } from 'issue-filing/common/create-issue-details-builder-for-unified';
import { IssueFilingControllerImpl } from 'issue-filing/common/issue-filing-controller-impl';
import { IssueFilingUrlStringUtils } from 'issue-filing/common/issue-filing-url-string-utils';
import { PlainTextFormatter } from 'issue-filing/common/markup/plain-text-formatter';
import { IssueFilingServiceProviderForUnifiedImpl } from 'issue-filing/issue-filing-service-provider-for-unified-impl';
import { UnifiedResultToIssueFilingDataConverter } from 'issue-filing/unified-result-to-issue-filing-data';
import { loadTheme, setFocusVisibility } from 'office-ui-fabric-react';
import * as ReactDOM from 'react-dom';
import { ReportExportServiceProviderImpl } from 'report-export/report-export-service-provider-impl';
import { getDefaultAddListenerForCollapsibleSection } from 'reports/components/report-sections/collapsible-script-provider';
import { ReactStaticRenderer } from 'reports/react-static-renderer';
import { ReportGenerator } from 'reports/report-generator';
import { ReportHtmlGenerator } from 'reports/report-html-generator';
import { UserConfigurationActions } from '../../background/actions/user-configuration-actions';
import { getPersistedData, PersistedData } from '../../background/get-persisted-data';
import { IndexedDBDataKeys } from '../../background/IndexedDBDataKeys';
import { InstallationData } from '../../background/installation-data';
import { UserConfigurationStore } from '../../background/stores/global/user-configuration-store';
import {
    getApplicationTelemetryDataFactory,
    getTelemetryClient,
} from '../../background/telemetry/telemetry-client-provider';
import { TelemetryEventHandler } from '../../background/telemetry/telemetry-event-handler';
import { TelemetryLogger } from '../../background/telemetry/telemetry-logger';
import { TelemetryStateListener } from '../../background/telemetry/telemetry-state-listener';
import { initializeFabricIcons } from '../../common/fabric-icons';
import { getIndexedDBStore } from '../../common/indexedDB/get-indexeddb-store';
import { IndexedDBAPI, IndexedDBUtil } from '../../common/indexedDB/indexedDB';
import { BaseClientStoresHub } from '../../common/stores/base-client-stores-hub';
import { androidAppTitle } from '../../content/strings/application';
import { ElectronAppDataAdapter } from '../adapters/electron-app-data-adapter';
import { ElectronStorageAdapter } from '../adapters/electron-storage-adapter';
import { DeviceConnectActionCreator } from '../flux/action-creator/device-connect-action-creator';
import { DeviceActions } from '../flux/action/device-actions';
import { DeviceStore } from '../flux/store/device-store';
import { ElectronLink } from './device-connect-view/components/electron-link';
import { sendAppInitializedTelemetryEvent } from './device-connect-view/send-app-initialized-telemetry';
import {
    RootContainerRenderer,
    RootContainerRendererDeps,
} from './root-container/root-container-renderer';
import { screenshotViewModelProvider } from './screenshot/screenshot-view-model-provider';

declare var window: Window & {
    insightsUserConfiguration: UserConfigurationController;
    featureFlagsController: FeatureFlagsController;
};

initializeFabricIcons();

const indexedDBInstance: IndexedDBAPI = new IndexedDBUtil(getIndexedDBStore());

const userConfigActions = new UserConfigurationActions();
const deviceActions = new DeviceActions();
const androidSetupActions = new AndroidSetupActions();
const windowFrameActions = new WindowFrameActions();
const windowStateActions = new WindowStateActions();
const scanActions = new ScanActions();
const unifiedScanResultActions = new UnifiedScanResultActions();
const cardSelectionActions = new CardSelectionActions();
const detailsViewActions = new DetailsViewActions();
const sidePanelActions = new SidePanelActions();
const previewFeaturesActions = new PreviewFeaturesActions(); // not really used but needed by DetailsViewStore
const contentActions = new ContentActions(); // not really used but needed by DetailsViewStore
const featureFlagActions = new FeatureFlagActions();
const ipcRendererShim = new IpcRendererShim(ipcRenderer);
ipcRendererShim.initialize();

const storageAdapter = new ElectronStorageAdapter(indexedDBInstance);
const appDataAdapter = new ElectronAppDataAdapter(config);

const indexedDBDataKeysToFetch = [
    IndexedDBDataKeys.userConfiguration,
    IndexedDBDataKeys.installation,
    IndexedDBDataKeys.unifiedFeatureFlags,
];

// tslint:disable-next-line:no-floating-promises - top-level entry points are intentionally floating promises
getPersistedData(indexedDBInstance, indexedDBDataKeysToFetch).then(
    (persistedData: Partial<PersistedData>) => {
        const installationData: InstallationData = persistedData.installationData;

        const logger = createDefaultLogger();

        const applicationTelemetryDataFactory = getApplicationTelemetryDataFactory(
            installationData,
            storageAdapter,
            appDataAdapter,
            androidAppTitle,
        );

        const platformInfo = new PlatformInfo(process);

        const userConfigurationStore = new UserConfigurationStore(
            persistedData.userConfigurationData,
            userConfigActions,
            indexedDBInstance,
        );
        userConfigurationStore.initialize();

        const deviceStore = new DeviceStore(deviceActions);
        deviceStore.initialize();

        const androidSetupStore = new AndroidSetupStore(
            androidSetupActions,
            createAndroidSetupStateMachineFactory({} as AndroidSetupDeps),
        );
        androidSetupStore.initialize();

        const windowStateStore = new WindowStateStore(windowStateActions);
        windowStateStore.initialize();

        const unifiedScanResultStore = new UnifiedScanResultStore(unifiedScanResultActions);
        unifiedScanResultStore.initialize();

        const scanStore = new ScanStore(scanActions);
        scanStore.initialize();

        const cardSelectionStore = new CardSelectionStore(
            cardSelectionActions,
            unifiedScanResultActions,
        );
        cardSelectionStore.initialize();

        const detailsViewStore = new DetailsViewStore(
            previewFeaturesActions,
            contentActions,
            detailsViewActions,
            sidePanelActions,
        );
        detailsViewStore.initialize();

        const featureFlagStore = new FeatureFlagStore(
            featureFlagActions,
            storageAdapter,
            persistedData,
            new FeatureFlagDefaultsHelper(getAllFeatureFlagDetailsUnified),
        );
        featureFlagStore.initialize();

        const windowFrameUpdater = new WindowFrameUpdater(windowFrameActions, ipcRendererShim);
        windowFrameUpdater.initialize();

        const storesHub = new BaseClientStoresHub<RootContainerState>([
            userConfigurationStore,
            deviceStore,
            windowStateStore,
            scanStore,
            unifiedScanResultStore,
            cardSelectionStore,
            detailsViewStore,
            featureFlagStore,
            androidSetupStore,
        ]);

        const fetchScanResults = createScanResultsFetcher(axios.get);
        const fetchDeviceConfig = createDeviceConfigFetcher(axios.get);

        const interpreter = new Interpreter();

        const featureFlagsController = new FeatureFlagsController(featureFlagStore, interpreter);

        const dispatcher = new DirectActionMessageDispatcher(interpreter);
        const userConfigMessageCreator = new UserConfigMessageCreator(dispatcher);
        const userConfigurationActionCreator = new UserConfigurationActionCreator(
            userConfigActions,
        );

        const telemetryDataFactory = new TelemetryDataFactory();
        const telemetryLogger = new TelemetryLogger(logger);
        telemetryLogger.initialize(featureFlagsController);

        const consoleTelemetryClient = new ConsoleTelemetryClient(
            applicationTelemetryDataFactory,
            telemetryLogger,
        );

        const telemetryClient = getTelemetryClient(applicationTelemetryDataFactory, AppInsights, [
            consoleTelemetryClient,
        ]);
        const telemetryEventHandler = new TelemetryEventHandler(telemetryClient);

        registerUserConfigurationMessageCallback(interpreter, userConfigurationActionCreator);

        const telemetryStateListener = new TelemetryStateListener(
            userConfigurationStore,
            telemetryEventHandler,
        );
        telemetryStateListener.initialize();

        const ipcMessageReceiver = new IpcMessageReceiver(interpreter, ipcRenderer, logger);
        ipcMessageReceiver.initialize();

        const androidSetupActionCreator = new AndroidSetupActionCreator(androidSetupActions);

        const deviceConnectActionCreator = new DeviceConnectActionCreator(
            deviceActions,
            fetchDeviceConfig,
            telemetryEventHandler,
        );
        const windowFrameActionCreator = new WindowFrameActionCreator(windowFrameActions);
        const windowStateActionCreator = new WindowStateActionCreator(
            windowStateActions,
            windowFrameActionCreator,
        );
        const scanActionCreator = new ScanActionCreator(scanActions, deviceActions);

        const featureFlagActionCreator = new FeatureFlagsActionCreator(
            interpreter,
            featureFlagActions,
            telemetryEventHandler,
        );
        featureFlagActionCreator.registerCallbacks();

        const cardSelectionActionCreator = new CardSelectionActionCreator(
            interpreter,
            cardSelectionActions,
            telemetryEventHandler,
        );
        cardSelectionActionCreator.registerCallbacks();

        const nullDetailsViewController = new NullDetailsViewController();

        const detailsViewActionCreator = new DetailsViewActionCreator(
            interpreter,
            detailsViewActions,
            sidePanelActions,
            nullDetailsViewController,
            telemetryEventHandler,
            logger,
        );
        detailsViewActionCreator.registerCallback();

        const cardSelectionMessageCreator = new CardSelectionMessageCreator(
            dispatcher,
            telemetryDataFactory,
            TelemetryEventSource.ElectronAutomatedChecksView,
        );

        const windowFrameListener = new WindowFrameListener(
            windowStateActionCreator,
            ipcRendererShim,
        );
        windowFrameListener.initialize();

        const getToolData = createGetToolDataDelegate(
            androidAppTitle,
            appDataAdapter.getVersion(),
            'axe-android',
        );

        const unifiedResultsBuilder = createDefaultBuilder(getToolData);
        const scanController = new ScanController(
            scanActions,
            unifiedScanResultActions,
            fetchScanResults,
            unifiedResultsBuilder,
            telemetryEventHandler,
            DateProvider.getCurrentDate,
            logger,
        );

        scanController.initialize();

        const dropdownActionMessageCreator = new DropdownActionMessageCreator(
            telemetryDataFactory,
            dispatcher,
        );

        const dropdownClickHandler = new DropdownClickHandler(
            dropdownActionMessageCreator,
            TelemetryEventSource.ElectronAutomatedChecksView,
        );

        const detailsViewActionMessageCreator = new DetailsViewActionMessageCreator(
            telemetryDataFactory,
            dispatcher,
        );

        const fixInstructionProcessor = new FixInstructionProcessor();

        const issueFilingController = new IssueFilingControllerImpl(
            shell.openExternal,
            IssueFilingServiceProviderForUnifiedImpl,
            userConfigurationStore,
        );

        const issueFilingActionCreator = new IssueFilingActionCreator(
            interpreter,
            telemetryEventHandler,
            issueFilingController,
        );
        issueFilingActionCreator.registerCallbacks();

        const issueDetailsTextGenerator = new IssueDetailsTextGenerator(
            IssueFilingUrlStringUtils,
            createIssueDetailsBuilderForUnified(PlainTextFormatter),
        );

        const issueFilingActionMessageCreator = new IssueFilingActionMessageCreator(
            dispatcher,
            telemetryDataFactory,
            TelemetryEventSource.ElectronAutomatedChecksView,
        );

        const navigatorUtils = new NavigatorUtils(window.navigator, logger);

        const windowUtils = new WindowUtils();

        const cardsViewDeps: CardsViewDeps = {
            LinkComponent: ElectronLink,

            cardInteractionSupport: allCardInteractionsSupported,
            getCardSelectionViewData: getCardSelectionViewData,
            collapsibleControl: CardsCollapsibleControl,
            cardsVisualizationModifierButtons: ExpandCollapseVisualHelperModifierButtons,
            fixInstructionProcessor,
            getGuidanceTagsFromGuidanceLinks: GetGuidanceTagsFromGuidanceLinks,

            userConfigMessageCreator: userConfigMessageCreator,
            cardSelectionMessageCreator,

            detailsViewActionMessageCreator,
            issueFilingActionMessageCreator: issueFilingActionMessageCreator,

            toolData: null,
            getPropertyConfigById: getPropertyConfiguration,

            issueDetailsTextGenerator: issueDetailsTextGenerator,
            issueFilingServiceProvider: IssueFilingServiceProviderForUnifiedImpl,
            navigatorUtils: navigatorUtils,
            unifiedResultToIssueFilingDataConverter: new UnifiedResultToIssueFilingDataConverter(),
            windowUtils: windowUtils,
            setFocusVisibility,
            customCongratsMessage:
                "No failed automated checks were found. Continue investigating your app's accessibility compliance through manual testing.",
        };

        const documentManipulator = new DocumentManipulator(document);

        const reportHtmlGenerator = new ReportHtmlGenerator(
            UnifiedReportSectionFactory,
            new ReactStaticRenderer(),
            getDefaultAddListenerForCollapsibleSection,
            DateProvider.getUTCStringFromDate,
            GetGuidanceTagsFromGuidanceLinks,
            fixInstructionProcessor,
            getPropertyConfiguration,
        );

        const reportGenerator = new ReportGenerator(
            new UnifiedReportNameGenerator(),
            reportHtmlGenerator,
            null,
        );

        const startTesting = () => {
            windowStateActionCreator.setRoute({ routeId: 'resultsView' });
            windowFrameActionCreator.maximize();
        };

        const deps: RootContainerRendererDeps = {
            ipcRendererShim: ipcRendererShim,
            userConfigurationStore,
            deviceStore,
            userConfigMessageCreator,
            windowStateActionCreator,
            dropdownClickHandler,
            LinkComponent: ElectronLink,
            fetchScanResults,
            deviceConnectActionCreator,
            androidSetupActionCreator,
            storesHub,
            scanActionCreator,
            windowFrameActionCreator,
            platformInfo,
            getCardsViewData: getCardViewData,
            getCardSelectionViewData: getCardSelectionViewData,
            screenshotViewModelProvider,
            ...cardsViewDeps,
            storeActionMessageCreator: new NullStoreActionMessageCreator(),
            settingsProvider: UnifiedSettingsProvider,
            loadTheme,
            documentManipulator,
            isResultHighlightUnavailable: isResultHighlightUnavailableUnified,
            reportGenerator: reportGenerator,
            fileURLProvider: new FileURLProvider(windowUtils, provideBlob),
            getDateFromTimestamp: DateProvider.getDateFromTimestamp,
            reportExportServiceProvider: ReportExportServiceProviderImpl,
            androidSetupStepComponentProvider: defaultAndroidSetupComponents,
            closeApp: ipcRendererShim.closeWindow,
            startTesting: startTesting,
        };

        window.insightsUserConfiguration = new UserConfigurationController(interpreter);
        window.featureFlagsController = featureFlagsController;

        const renderer = new RootContainerRenderer(ReactDOM.render, document, deps);
        renderer.render();

        sendAppInitializedTelemetryEvent(telemetryEventHandler, platformInfo);

        ipcRendererShim.initializeWindow();
    },
);
