import { useState } from 'react';
import { Search, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchOptions } from '@/types';

interface SimpleSearchFormProps {
  onSearch: (usernames: string[], options: SearchOptions) => void;
  isSearching: boolean;
}

const DEFAULT_OPTIONS: SearchOptions = {
  topSites: 500,
  timeout: 30,
  useCookies: false,
  allSites: false,
  disableRecursiveSearch: false,
  disableExtracting: false,
  withDomains: false,
  permute: false,
  tags: [],
  siteList: [],
};

const AVAILABLE_TAGS = [
  'gaming', 'coding', 'photo', 'music', 'blog', 'finance', 'freelance', 'dating',
  'tech', 'forum', 'porn', 'erotic', 'webcam', 'video', 'movies', 'hacking',
  'art', 'discussion', 'sharing', 'writing', 'wiki', 'business', 'shopping',
  'sport', 'books', 'news', 'documents', 'travel', 'maps', 'hobby', 'apps',
  'classified', 'career', 'geosocial', 'streaming', 'education', 'networking',
  'torrent', 'science', 'medicine', 'reading', 'stock', 'messaging', 'trading',
  'links', 'fashion', 'tasks', 'military', 'auto', 'gambling', 'cybercriminal',
  'review', 'bookmarks', 'design', 'tor', 'i2p', 'q&a', 'crypto', 'ai'
];

export function SimpleSearchForm({ onSearch, isSearching }: SimpleSearchFormProps) {
  const [usernames, setUsernames] = useState('');
  const [options, setOptions] = useState<SearchOptions>(DEFAULT_OPTIONS);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const usernameList = usernames
      .split(/[,\s]+/)
      .map(u => u.trim())
      .filter(u => u.length > 0);
    
    if (usernameList.length === 0) {
      alert('Please enter at least one username');
      return;
    }

    const searchOptions: SearchOptions = {
      ...options,
      tags: selectedTags,
    };

    onSearch(usernameList, searchOptions);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="border-0 shadow-lg bg-background/50 backdrop-blur">
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Main Search Input */}
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  OSINT Search
                </h2>
                <p className="text-muted-foreground">
                  Search for usernames across thousands of websites
                </p>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={usernames}
                  onChange={(e) => setUsernames(e.target.value)}
                  placeholder="Enter username(s) to search..."
                  className="pl-10 h-12 text-lg"
                  disabled={isSearching}
                />
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                Separate multiple usernames with spaces or commas
              </div>
            </div>

            {/* Quick Options */}
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allSites"
                  checked={options.allSites}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, allSites: !!checked }))}
                  disabled={isSearching}
                />
                <Label htmlFor="allSites" className="text-sm">Search All Sites</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useCookies"
                  checked={options.useCookies}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, useCookies: !!checked }))}
                  disabled={isSearching}
                />
                <Label htmlFor="useCookies" className="text-sm">Use Cookies</Label>
              </div>
            </div>

            {/* Advanced Options Toggle */}
            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-4 w-4 mr-2" />
                Advanced Options
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>
            </div>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="space-y-6 pt-4 border-t">
                {/* Basic Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="topSites" className="text-sm">Number of Sites</Label>
                    <Input
                      id="topSites"
                      type="number"
                      value={options.topSites}
                      onChange={(e) => setOptions(prev => ({ ...prev, topSites: parseInt(e.target.value) || 500 }))}
                      min="1"
                      max="10000"
                      disabled={options.allSites || isSearching}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeout" className="text-sm">Timeout (seconds)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      value={options.timeout}
                      onChange={(e) => setOptions(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30 }))}
                      min="1"
                      disabled={isSearching}
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Tags Selection */}
                <div className="space-y-3">
                  <Label className="text-sm">Filter by Tags</Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 bg-muted/30 rounded-lg">
                    {AVAILABLE_TAGS.map(tag => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? "default" : "secondary"}
                        className="cursor-pointer hover:bg-primary/80 text-xs"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Advanced Switches */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="permute"
                      checked={options.permute}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, permute: checked }))}
                      disabled={isSearching}
                    />
                    <Label htmlFor="permute" className="text-sm">Username Permutations</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="disableRecursive"
                      checked={options.disableRecursiveSearch}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, disableRecursiveSearch: checked }))}
                      disabled={isSearching}
                    />
                    <Label htmlFor="disableRecursive" className="text-sm">Disable Recursive Search</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="disableExtracting"
                      checked={options.disableExtracting}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, disableExtracting: checked }))}
                      disabled={isSearching}
                    />
                    <Label htmlFor="disableExtracting" className="text-sm">Disable Information Extraction</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="withDomains"
                      checked={options.withDomains}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, withDomains: checked }))}
                      disabled={isSearching}
                    />
                    <Label htmlFor="withDomains" className="text-sm">Check Domains</Label>
                  </div>
                </div>
              </div>
            )}

            {/* Search Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-lg"
              disabled={isSearching || !usernames.trim()}
            >
              {isSearching ? (
                <>
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  Start Search
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
