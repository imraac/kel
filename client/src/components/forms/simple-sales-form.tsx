import SalesForm from "./SalesForm";

interface SimpleSalesFormProps {
  onSuccess?: () => void;
}

// Thin wrapper around unified SalesForm for backwards compatibility
export default function SimpleSalesForm({ onSuccess }: SimpleSalesFormProps) {
  return (
    <SalesForm
      mode="page"
      onSuccess={onSuccess}
      customerNameRequired={true}
      showNotes={true}
    />
  );
}