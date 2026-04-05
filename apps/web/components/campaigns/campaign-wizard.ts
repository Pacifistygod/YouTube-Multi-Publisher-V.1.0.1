export interface WizardVideoOption {
  id: string;
  original_name: string;
  duration_seconds: number;
}

export interface WizardChannelOption {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  isActive: boolean;
}

export interface MetadataFieldDef {
  required: boolean;
  options?: string[];
}

export interface WizardStep {
  label: string;
  clickable: boolean;
  videos?: WizardVideoOption[];
  channels?: WizardChannelOption[];
  metadataFields?: Record<string, MetadataFieldDef>;
  confirmationMessage?: string;
}

export interface CampaignWizardData {
  availableVideos: WizardVideoOption[];
  availableChannels: WizardChannelOption[];
}

export interface CampaignWizardView {
  steps: WizardStep[];
  currentStep: number;
  autoSaveDraftStatus: 'draft';
}

export function buildCampaignWizardView(data: CampaignWizardData): CampaignWizardView {
  const steps: WizardStep[] = [
    {
      label: 'Select video',
      clickable: true,
      videos: data.availableVideos,
    },
    {
      label: 'Select channels',
      clickable: true,
      channels: data.availableChannels.filter((ch) => ch.isActive),
    },
    {
      label: 'Metadata',
      clickable: true,
      metadataFields: {
        videoTitle: { required: true },
        videoDescription: { required: true },
        tags: { required: false },
        privacy: { required: false, options: ['public', 'unlisted', 'private'] },
      },
    },
    {
      label: 'Review & launch',
      clickable: true,
      confirmationMessage: 'Tem certeza? Isso vai iniciar o upload para o YouTube.',
    },
  ];

  return {
    steps,
    currentStep: 0,
    autoSaveDraftStatus: 'draft',
  };
}
