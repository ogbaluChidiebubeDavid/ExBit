import { StepIndicator } from '../StepIndicator';

export default function StepIndicatorExample() {
  return (
    <StepIndicator
      currentStep={2}
      steps={['Network', 'Amount', 'Bank Details', 'Confirm']}
    />
  );
}
