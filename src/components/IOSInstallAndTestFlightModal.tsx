import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  Share,
  PlusSquare,
  Terminal,
  CheckCircle2,
  X,
  Copy,
  Check,
  FileCode2,
  CloudUpload,
  KeyRound,
  GitBranch,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface IOSInstallAndTestFlightModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSInstallAndTestFlightModal: React.FC<IOSInstallAndTestFlightModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [activeMode, setActiveMode] = useState<'testflight' | 'pwa'>('testflight');
  const [bundleId, setBundleId] = useState('com.wisport.app');
  const [appleAppId, setAppleAppId] = useState('6836381233');
  const [copiedType, setCopiedType] = useState<'yaml' | 'cap' | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: false,
    4: false,
  });

  if (!isOpen) return null;

  const toggleStep = (step: number) => {
    setCompletedSteps((prev) => ({ ...prev, [step]: !prev[step] }));
  };

  const generatedCodemagicYaml = `workflows:
  ios-testflight-cloud-build:
    name: Wisport iOS TestFlight Build (No Xcode Required)
    max_build_duration: 60
    instance_type: mac_mini_m2
    integrations:
      app_store_connect: Codemagic_AppStoreConnect_Key
    environment:
      ios_signing:
        distribution_type: app_store
        bundle_identifier: ${bundleId.trim() || 'com.wisport.app'}
      vars:
        BUNDLE_ID: "${bundleId.trim() || 'com.wisport.app'}"
        XCODE_WORKSPACE: "ios/App/App.xcworkspace"
        XCODE_SCHEME: "App"
        APP_STORE_APPLE_ID: ${appleAppId.trim() || '6836381233'}
      node: 22
      xcode: latest
      cocoapods: default
    scripts:
      - name: Install & Build Wisport
        script: npm install && npm run build
      - name: Sync Capacitor iOS Native Project
        script: npx cap sync ios
      - name: Sign & Compile .ipa for TestFlight
        script: |
          xcode-project use-profiles
          xcode-project build-ipa --workspace "$CM_BUILD_DIR/$XCODE_WORKSPACE" --scheme "$XCODE_SCHEME"
    publishing:
      app_store_connect:
        auth: integration
        submit_to_testflight: true`;

  const handleCopy = (text: string, type: 'yaml' | 'cap') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-deploy-title"
    >
      <div className="w-full max-w-3xl rounded-2xl bg-[#12151E] border border-[#1E2433] p-6 text-[#F1F5F9] shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#1E2433] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00E5FF]/15 text-[#00E5FF]">
              <CloudUpload className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="ios-deploy-title"
                className="font-display text-2xl font-bold tracking-wide uppercase"
              >
                Assistant TestFlight Cloud (Sans Xcode sur votre Mac)
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Projet natif Capacitor iOS (<code className="text-[#CCFF00]">/ios</code>) + Pipeline Cloud Mac M2 (<code className="text-[#00E5FF]">codemagic.yaml</code>) pré-intégrés
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer la fenêtre d'installation iOS"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#1E2433] hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-[#090A0F] p-1.5 border border-[#1E2433]">
          <button
            type="button"
            onClick={() => setActiveMode('testflight')}
            className={`py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeMode === 'testflight'
                ? 'bg-[#00E5FF] text-[#090A0F]'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Option 2 (Active) : Pipeline TestFlight Cloud (Sans Xcode)
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('pwa')}
            className={`py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeMode === 'pwa'
                ? 'bg-[#CCFF00] text-[#090A0F]'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Option 1 : App Native Web Safari (Secours 0€)
          </button>
        </div>

        {activeMode === 'testflight' ? (
          <div className="mt-5 space-y-5">
            {/* Direct 1-Click Project ZIP Download Box */}
            <div className="rounded-xl bg-[#CCFF00]/10 border border-[#CCFF00] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-[#CCFF00] uppercase flex items-center gap-1.5">
                  <Download className="h-4 w-4" />
                  Téléchargement Direct du Projet Complet (Pour GitHub & TestFlight)
                </div>
                <p className="text-xs text-[#E2E8F0] leading-relaxed">
                  Téléchargez l&apos;archive <code className="font-mono text-[#CCFF00]">wisport-ios-testflight-pack.zip</code> contenant tout le code de <strong>Wisport</strong>, le dossier natif <code className="font-mono text-[#CCFF00]">/ios</code> et le fichier <code className="font-mono text-[#00E5FF]">codemagic.yaml</code> configuré avec votre Apple ID <code className="font-mono text-[#CCFF00]">6836381233</code>.
                </p>
              </div>
              <a
                href="/api/export/project-zip"
                download="wisport-ios-testflight-pack.zip"
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#CCFF00] text-[#090A0F] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#b8e600] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Télécharger le ZIP Wisport
              </a>
            </div>

            {/* Status Banner of Pre-Configured Files */}
            <div className="rounded-xl bg-[#10B981]/10 border border-[#10B981]/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#10B981] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-[#10B981] uppercase">
                    Architecture iOS Prête dans votre Projet
                  </div>
                  <p className="text-xs text-[#E2E8F0] mt-0.5">
                    Les fichiers <code className="font-mono text-[#CCFF00]">capacitor.config.ts</code>, le dossier natif Xcode <code className="font-mono text-[#CCFF00]">/ios</code> et le pipeline <code className="font-mono text-[#00E5FF]">codemagic.yaml</code> ont été générés à la racine de votre application.
                  </p>
                </div>
              </div>
              <span className="font-mono-tabular text-xs font-semibold text-[#10B981] shrink-0">
                100% Sans Xcode Local
              </span>
            </div>

            {/* Interactive Customization Inputs */}
            <div className="rounded-xl bg-[#090A0F] border border-[#1E2433] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#00E5FF] flex items-center gap-2">
                  <FileCode2 className="h-4 w-4" />
                  Paramètres d&apos;Identité Apple Developer
                </h3>
                <span className="text-[11px] text-[#94A3B8]">Personnalisez si nécessaire</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="bundle-id-input"
                    className="block text-xs text-[#94A3B8] mb-1 font-medium"
                  >
                    Bundle Identifier iOS
                  </label>
                  <input
                    id="bundle-id-input"
                    type="text"
                    value={bundleId}
                    onChange={(e) => setBundleId(e.target.value)}
                    className="w-full h-10 rounded-lg bg-[#12151E] border border-[#1E2433] px-3 font-mono-tabular text-xs text-[#F1F5F9] focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="apple-id-input"
                    className="block text-xs text-[#94A3B8] mb-1 font-medium"
                  >
                    Apple ID de l&apos;App (App Store Connect)
                  </label>
                  <input
                    id="apple-id-input"
                    type="text"
                    value={appleAppId}
                    onChange={(e) => setAppleAppId(e.target.value)}
                    className="w-full h-10 rounded-lg bg-[#12151E] border border-[#1E2433] px-3 font-mono-tabular text-xs text-[#F1F5F9] focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
              </div>
            </div>

            {/* Step-by-Step Interactive Checklist */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F1F5F9]">
                Checklist de Déploiement vers TestFlight (10 min depuis votre navigateur)
              </h3>

              <div
                onClick={() => toggleStep(1)}
                className="p-3.5 rounded-xl bg-[#090A0F] border border-[#1E2433] hover:border-[#00E5FF] flex items-start gap-3 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={completedSteps[1]}
                  onChange={() => {}}
                  className="mt-1 accent-[#CCFF00] h-4 w-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-[#F1F5F9] flex items-center gap-2">
                    <GitBranch className="h-3.5 w-3.5 text-[#CCFF00]" />
                    Étape 1 (Déjà fait par l&apos;IA) : Génération du projet iOS & Pipeline Cloud
                  </div>
                  <p className="text-[#94A3B8] mt-1">
                    Votre code inclut désormais <code className="text-[#F1F5F9]">@capacitor/ios</code>, le dossier natif <code className="text-[#F1F5F9]">/ios</code> et <code className="text-[#F1F5F9]">codemagic.yaml</code>. Exportez ou synchronisez simplement ce projet vers votre dépôt GitHub.
                  </p>
                </div>
              </div>

              <div
                onClick={() => toggleStep(2)}
                className="p-3.5 rounded-xl bg-[#090A0F] border border-[#1E2433] hover:border-[#00E5FF] flex items-start gap-3 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={completedSteps[2]}
                  onChange={() => {}}
                  className="mt-1 accent-[#CCFF00] h-4 w-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-[#F1F5F9] flex items-center gap-2">
                    <KeyRound className="h-3.5 w-3.5 text-[#00E5FF]" />
                    Étape 2 : Créer votre clé API App Store Connect (Sans Mac requis)
                  </div>
                  <p className="text-[#94A3B8] mt-1">
                    Sur <strong>appstoreconnect.apple.com</strong> : allez dans <em>Utilisateurs et accès → Intégrations → Clés App Store Connect</em>, générez une clé avec le rôle <strong>App Manager</strong> et téléchargez le fichier <code className="text-[#F1F5F9]">.p8</code> (notez l&apos;Issuer ID et le Key ID).
                  </p>
                </div>
              </div>

              <div
                onClick={() => toggleStep(3)}
                className="p-3.5 rounded-xl bg-[#090A0F] border border-[#1E2433] hover:border-[#00E5FF] flex items-start gap-3 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={completedSteps[3]}
                  onChange={() => {}}
                  className="mt-1 accent-[#CCFF00] h-4 w-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-[#F1F5F9] flex items-center gap-2">
                    <CloudUpload className="h-3.5 w-3.5 text-[#CCFF00]" />
                    Étape 3 : Connecter le dépôt à Codemagic.io (Mac M2 Cloud Gratuit)
                  </div>
                  <p className="text-[#94A3B8] mt-1">
                    Créez un compte gratuit sur <strong>codemagic.io</strong> (500 min/mois offertes sur Mac Mini M2). Ajoutez votre dépôt GitHub, puis dans <em>Teams / Integrations → Developer Portal</em>, importez votre clé <code className="text-[#F1F5F9]">.p8</code> sous le nom <code className="text-[#00E5FF]">Codemagic_AppStoreConnect_Key</code>.
                  </p>
                </div>
              </div>

              <div
                onClick={() => toggleStep(4)}
                className="p-3.5 rounded-xl bg-[#090A0F] border border-[#1E2433] hover:border-[#00E5FF] flex items-start gap-3 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={completedSteps[4]}
                  onChange={() => {}}
                  className="mt-1 accent-[#CCFF00] h-4 w-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-[#F1F5F9] flex items-center gap-2">
                    <Smartphone className="h-3.5 w-3.5 text-[#10B981]" />
                    Étape 4 : Cliquer sur « Start New Build » et ouvrir TestFlight
                  </div>
                  <p className="text-[#94A3B8] mt-1">
                    Codemagic détecte automatiquement le fichier <code className="text-[#F1F5F9]">codemagic.yaml</code>, crée vos certificats iOS et profils de provisioning tout seul, compile le fichier <code className="text-[#F1F5F9]">.ipa</code> avec la dernière version de Xcode dans le cloud, et le pousse dans votre application <strong>TestFlight</strong> sur iPhone.
                  </p>
                </div>
              </div>
            </div>

            {/* Preview & Copy of codemagic.yaml */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono text-[#94A3B8] flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-[#00E5FF]" /> Fichier /codemagic.yaml actif
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(generatedCodemagicYaml, 'yaml')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#090A0F] border border-[#1E2433] text-xs text-[#F1F5F9] hover:border-[#00E5FF] transition-colors cursor-pointer"
                >
                  {copiedType === 'yaml' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#10B981]" /> Copié
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copier codemagic.yaml
                    </>
                  )}
                </button>
              </div>
              <pre className="rounded-xl bg-[#090A0F] border border-[#1E2433] p-3.5 text-[11px] font-mono text-[#E2E8F0] overflow-x-auto max-h-48">
                {generatedCodemagicYaml}
              </pre>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl bg-[#090A0F] border border-[#1E2433] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#F1F5F9]">
                    Installation directe sur iPhone (Mode Standalone Plein Écran)
                  </h3>
                  <p className="mt-1 text-xs text-[#94A3B8] leading-relaxed">
                    En attendant la validation de votre premier build TestFlight par Apple, vous pouvez installer immédiatement la version PWA plein écran sur votre iPhone :
                  </p>
                </div>
                {isInstalled && (
                  <span className="text-xs font-mono text-[#10B981] shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Installée
                  </span>
                )}
              </div>

              {isInstallable && (
                <div className="mt-4">
                  <button
                    onClick={install}
                    className="w-full py-3 px-4 rounded-xl bg-[#CCFF00] text-[#090A0F] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#b8e600] transition-colors cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    Installer Wisport sur cet appareil maintenant
                  </button>
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg bg-[#12151E] border border-[#1E2433] p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#CCFF00]">
                    <span className="font-mono-tabular">01.</span> Ouvrir dans Safari
                  </div>
                  <p className="mt-1.5 text-xs text-[#94A3B8]">
                    Ouvrez l&apos;URL de cette application dans Safari sur votre iPhone.
                  </p>
                </div>
                <div className="rounded-lg bg-[#12151E] border border-[#1E2433] p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#CCFF00]">
                    <Share className="h-3.5 w-3.5" />
                    <span>02. Bouton Partager</span>
                  </div>
                  <p className="mt-1.5 text-xs text-[#94A3B8]">
                    Appuyez sur l&apos;icône Partager dans la barre inférieure de Safari.
                  </p>
                </div>
                <div className="rounded-lg bg-[#12151E] border border-[#1E2433] p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#CCFF00]">
                    <PlusSquare className="h-3.5 w-3.5" />
                    <span>03. Sur l&apos;écran d&apos;accueil</span>
                  </div>
                  <p className="mt-1.5 text-xs text-[#94A3B8]">
                    Sélectionnez « Sur l&apos;écran d&apos;accueil » pour installer l&apos;app native.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#1E2433] text-xs font-semibold text-white hover:bg-[#2A3246] transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
