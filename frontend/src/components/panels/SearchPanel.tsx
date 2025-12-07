/**
 * Search Panel Component - Advanced node search and filtering
 */

import React, { useState, useEffect, useMemo } from 'react';
import { usePipelineStore } from '../../store/pipelineStore';
import { PipelineNode } from '../../types';
import {
  SearchIcon,
  XIcon,
  FilterIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  StarIcon,
  PinIcon,
} from '../icons/Icons';

interface SearchResult {
  node: PipelineNode;
  matchType: 'name' | 'type' | 'category';
  score: number;
}

interface SearchPanelProps {
  onClose: () => void;
  onNodeFocus: (nodeId: string) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ onClose, onNodeFocus }) => {
  const { nodes, selectedNodes, setSelectedNodes } = usePipelineStore();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [bookmarkedNodes, setBookmarkedNodes] = useState<string[]>([]);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filterNodeType, setFilterNodeType] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);

  // Get unique values for filters
  const nodeTypes = useMemo(() => {
    return Array.from(new Set(nodes.map(n => n.data.nodeType))).filter(Boolean);
  }, [nodes]);

  const categories = useMemo(() => {
    return Array.from(new Set(nodes.map(n => n.data.category).filter(Boolean))) as string[];
  }, [nodes]);

  // Fuzzy search function
  const fuzzyMatch = (text: string, query: string): number => {
    if (!query) return 1;

    text = text.toLowerCase();
    query = query.toLowerCase();

    // Exact match - highest score
    if (text === query) return 100;

    // Starts with - high score
    if (text.startsWith(query)) return 90;

    // Contains - medium score
    if (text.includes(query)) return 70;

    // Fuzzy match - lower score
    let queryIndex = 0;
    let score = 0;

    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
      if (text[i] === query[queryIndex]) {
        score += 1;
        queryIndex++;
      }
    }

    if (queryIndex === query.length) {
      return (score / query.length) * 50;
    }

    return 0;
  };

  // Search and filter results
  const searchResults = useMemo(() => {
    let results: SearchResult[] = [];

    nodes.forEach(node => {
      let maxScore = 0;
      let matchType: 'name' | 'type' | 'category' = 'name';

      // Search by name
      const nameScore = fuzzyMatch(node.data.label, searchQuery);
      if (nameScore > maxScore) {
        maxScore = nameScore;
        matchType = 'name';
      }

      // Search by type
      const typeScore = fuzzyMatch(node.data.nodeType, searchQuery);
      if (typeScore > maxScore) {
        maxScore = typeScore;
        matchType = 'type';
      }

      // Search by category
      if (node.data.category) {
        const categoryScore = fuzzyMatch(node.data.category, searchQuery);
        if (categoryScore > maxScore) {
          maxScore = categoryScore;
          matchType = 'category';
        }
      }

      // Apply filters
      if (filterNodeType.length > 0 && !filterNodeType.includes(node.data.nodeType)) {
        return;
      }

      if (filterCategory.length > 0 && (!node.data.category || !filterCategory.includes(node.data.category))) {
        return;
      }

      // Only add if score is above threshold
      if (maxScore > 0 || !searchQuery) {
        results.push({ node, matchType, score: maxScore });
      }
    });

    // Sort by score (descending)
    return results.sort((a, b) => b.score - a.score);
  }, [nodes, searchQuery, filterNodeType, filterCategory, filterStatus]);

  // Handle search submission
  const handleSearch = (query: string) => {
    setSearchQuery(query);

    // Add to history (avoid duplicates)
    if (query && !searchHistory.includes(query)) {
      const newHistory = [query, ...searchHistory.slice(0, 9)]; // Keep last 10
      setSearchHistory(newHistory);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    }
  };

  // Handle node click
  const handleNodeClick = (nodeId: string) => {
    setSelectedNodes([nodeId]);
    onNodeFocus(nodeId);
  };

  // Toggle bookmark
  const toggleBookmark = (nodeId: string) => {
    const newBookmarks = bookmarkedNodes.includes(nodeId)
      ? bookmarkedNodes.filter(id => id !== nodeId)
      : [...bookmarkedNodes, nodeId];

    setBookmarkedNodes(newBookmarks);
    localStorage.setItem('nodeBookmarks', JSON.stringify(newBookmarks));
  };

  // Toggle filter option
  const toggleFilter = (
    filterArray: string[],
    setFilterArray: React.Dispatch<React.SetStateAction<string[]>>,
    value: string
  ) => {
    if (filterArray.includes(value)) {
      setFilterArray(filterArray.filter(v => v !== value));
    } else {
      setFilterArray([...filterArray, value]);
    }
  };

  // Load saved data on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }

    const savedBookmarks = localStorage.getItem('nodeBookmarks');
    if (savedBookmarks) {
      setBookmarkedNodes(JSON.parse(savedBookmarks));
    }
  }, []);

  // Get bookmarked nodes
  const bookmarkedNodesList = useMemo(() => {
    return nodes.filter(n => bookmarkedNodes.includes(n.id));
  }, [nodes, bookmarkedNodes]);

  return (
    <div className="h-full flex flex-col bg-darkbg border-l border-darkborder">
      {/* Header */}
      <div className="p-4 border-b border-darkborder flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg"><SearchIcon size={18} /></span>
          <h2 className="text-sm font-semibold text-gray-300">Search & Filter</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          title="Close search panel"
        >
          <span className="text-gray-400"><XIcon size={14} /></span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-4 border-b border-darkborder">
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"><SearchIcon size={14} /></span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search nodes... (Ctrl+F)"
            className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            autoFocus
          />
        </div>

        {/* Search History */}
        {searchHistory.length > 0 && !searchQuery && (
          <div className="mt-2">
            <div className="text-xs text-gray-500 mb-1">Recent searches</div>
            <div className="flex flex-wrap gap-1">
              {searchHistory.slice(0, 5).map((query, idx) => (
                <button
                  key={idx}
                  onClick={() => setSearchQuery(query)}
                  className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="border-b border-darkborder">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-gray-400"><FilterIcon size={14} /></span>
            <span className="text-sm text-gray-300">Filters</span>
            {(filterNodeType.length + filterCategory.length + filterStatus.length) > 0 && (
              <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                {filterNodeType.length + filterCategory.length + filterStatus.length}
              </span>
            )}
          </div>
          <span className="text-gray-400">{showFilters ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}</span>
        </button>

        {showFilters && (
          <div className="p-4 space-y-4 bg-gray-900">
            {/* Node Type Filter */}
            <div>
              <div className="text-xs text-gray-500 mb-2">Node Type</div>
              <div className="flex flex-wrap gap-1">
                {nodeTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => toggleFilter(filterNodeType, setFilterNodeType, type)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      filterNodeType.includes(type)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-2">Category</div>
                <div className="flex flex-wrap gap-1">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => toggleFilter(filterCategory, setFilterCategory, category)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        filterCategory.includes(category)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear Filters */}
            {(filterNodeType.length + filterCategory.length + filterStatus.length) > 0 && (
              <button
                onClick={() => {
                  setFilterNodeType([]);
                  setFilterCategory([]);
                  setFilterStatus([]);
                }}
                className="w-full px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {/* Search Results */}
        {searchQuery && (
          <div className="p-4">
            <div className="text-xs text-gray-500 mb-2">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </div>
            <div className="space-y-1">
              {searchResults.map(({ node, matchType }) => (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node.id)}
                  className={`p-2 rounded cursor-pointer transition-colors ${
                    selectedNodes.includes(node.id)
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{node.data.label}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-2">
                        <span className="capitalize">{node.data.nodeType}</span>
                        {node.data.category && (
                          <>
                            <span>•</span>
                            <span>{node.data.category}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="text-gray-500">Match: {matchType}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(node.id);
                      }}
                      className={`p-1 rounded transition-colors ${
                        bookmarkedNodes.includes(node.id)
                          ? 'text-yellow-500 hover:text-yellow-400'
                          : 'text-gray-500 hover:text-gray-400'
                      }`}
                      title={bookmarkedNodes.includes(node.id) ? 'Remove bookmark' : 'Add bookmark'}
                    >
                      <StarIcon size={14} filled={bookmarkedNodes.includes(node.id)} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bookmarks */}
        {!searchQuery && bookmarkedNodesList.length > 0 && (
          <div className="p-4">
            <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <PinIcon size={12} />
              Bookmarks ({bookmarkedNodesList.length})
            </div>
            <div className="space-y-1">
              {bookmarkedNodesList.map(node => (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node.id)}
                  className={`p-2 rounded cursor-pointer transition-colors ${
                    selectedNodes.includes(node.id)
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{node.data.label}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-2">
                        <span className="capitalize">{node.data.nodeType}</span>
                        {node.data.category && (
                          <>
                            <span>•</span>
                            <span>{node.data.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(node.id);
                      }}
                      className="p-1 text-yellow-500 hover:text-yellow-400 rounded transition-colors"
                      title="Remove bookmark"
                    >
                      <StarIcon size={14} filled />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!searchQuery && bookmarkedNodesList.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-sm text-gray-500 text-center">
              <div className="text-5xl mb-3 flex justify-center"><SearchIcon size={48} /></div>
              <p className="mb-2">Search for nodes</p>
              <p className="text-xs text-gray-600">
                Use the search bar above or press Ctrl+F
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-darkborder bg-gray-900">
        <div className="text-xs text-gray-500 flex items-center justify-between">
          <span>Total: {nodes.length} nodes</span>
          {searchResults.length > 0 && (
            <span>Showing: {searchResults.length}</span>
          )}
        </div>
      </div>
    </div>
  );
};
