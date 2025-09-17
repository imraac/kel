import { useFarmContext } from '@/contexts/FarmContext';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Building2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function FarmSelector() {
  const { user } = useAuth();
  const { activeFarmId, setActiveFarmId, farms, isLoading, error } = useFarmContext();

  // Only show for admin users
  if (user?.role !== 'admin') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="farm-selector-loading">
        <Building2 className="h-4 w-4" />
        Loading farms...
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4" data-testid="farm-selector-error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex items-center gap-2" data-testid="farm-selector">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={activeFarmId || ''} onValueChange={setActiveFarmId} data-testid="farm-select">
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a farm to manage" />
        </SelectTrigger>
        <SelectContent>
          {farms.map((farm) => (
            <SelectItem key={farm.id} value={farm.id} data-testid={`farm-option-${farm.id}`}>
              {farm.name} - {farm.location}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}