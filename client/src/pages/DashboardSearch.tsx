// src/components/DashboardSearch.tsx
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search as SearchIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalCount: number;
  filteredCount: number;
}

export function DashboardSearch({
  searchQuery,
  onSearchChange,
  totalCount,
  filteredCount,
}: DashboardSearchProps) {
  const handleClearSearch = () => {
    onSearchChange("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Search Candidates</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by name, email, or phone number..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Search Results Summary */}
        <div className="mt-4 text-sm text-muted-foreground">
          {searchQuery ? (
            <p>
              Found <strong>{filteredCount}</strong> candidate
              {filteredCount !== 1 ? "s" : ""} matching "{searchQuery}" out of{" "}
              <strong>{totalCount}</strong> total candidates
            </p>
          ) : (
            <p>
              Showing all <strong>{totalCount}</strong> candidates
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
