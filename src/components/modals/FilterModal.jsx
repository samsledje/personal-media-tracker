import React, { useCallback } from 'react';
import { STATUS_LABELS } from "../../constants";
import { getStatusIcon } from '../../utils/statusUtils.jsx';

const FilterModal = ({
    // Filter state
    showFilters,
    filterRating,
    filterMaxRating,
    filterHasReview,
    filterHasCover,
    filterTags,
    filterStatuses,
    filterRecent,
    filterStartDate,
    filterEndDate,
    allTags,
    allStatuses,
    // Filter handlers
    setFilterRating,
    setFilterMaxRating,
    setFilterHasReview,
    setFilterHasCover,
    setFilterRecent,
    setFilterStartDate,
    setFilterEndDate,
    toggleTagFilter,
    toggleStatusFilter,
    clearFilters,
}) => {

    // Filter handlers
    const handleSetFilterRecent = useCallback((value) => {
        setFilterRecent(value);
    }, [setFilterRecent]);

    return (
        <>
            {/* Expanded Filters */}
            {showFilters && (
                <div data-filter-modal="1" data-testid="filter-modal" className="mb-6 p-4 bg-slate-800/40 border border-slate-700 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8">
                        {/* Status Filter */}
                        <div>
                            <div className="text-sm text-slate-300 mb-2">Status</div>
                            <div className="flex flex-wrap gap-2">
                                {allStatuses.length === 0 ? (
                                    <div className="text-sm text-slate-400">No status data available</div>
                                ) : (
                                    allStatuses.map(status => (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={(e) => {
                                                toggleStatusFilter(status);
                                                e.currentTarget.blur();
                                            }}
                                            className={`px-3 py-1 rounded-lg text-sm transition flex items-center gap-2 ${filterStatuses.includes(status) ? '' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                                                }`}
                                            style={filterStatuses.includes(status) ? { backgroundColor: 'var(--mt-highlight)', color: 'white' } : {}}
                                        >
                                            {getStatusIcon(status, "w-4 h-4")}
                                            {STATUS_LABELS[status]}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Rating Filter */}
                        <div>
                            <div className="text-sm text-slate-300 mb-2">Rating range</div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                {/* Minimum Rating */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400 min-w-fit">Min:</span>
                                    <div className="flex gap-1 flex-wrap">
                                        {[0, 1, 2, 3, 4, 5].map(r => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={(e) => {
                                                    setFilterRating(r);
                                                    e.currentTarget.blur();
                                                }}
                                                className={`px-1.5 py-0.5 rounded text-xs transition min-w-[28px] ${filterRating === r ? '' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                                                    }`}
                                                style={filterRating === r ? { backgroundColor: 'var(--mt-highlight)', color: 'white' } : {}}
                                                title={r === 0 ? 'Any minimum rating' : `Minimum ${r} star${r > 1 ? 's' : ''}`}
                                            >
                                                {r === 0 ? 'Any' : r}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Maximum Rating */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400 min-w-fit">Max:</span>
                                    <div className="flex gap-1 flex-wrap">
                                        {[0, 1, 2, 3, 4, 5].map(r => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={(e) => {
                                                    setFilterMaxRating(r);
                                                    e.currentTarget.blur();
                                                }}
                                                className={`px-1.5 py-0.5 rounded text-xs transition min-w-[28px] ${filterMaxRating === r ? '' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                                                    }`}
                                                style={filterMaxRating === r ? { backgroundColor: 'var(--mt-highlight)', color: 'white' } : {}}
                                                title={r === 0 ? 'Any maximum rating' : `Maximum ${r} star${r > 1 ? 's' : ''}`}
                                            >
                                                {r === 0 ? 'Any' : r}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Filter */}
                        <div>
                            <div className="text-sm text-slate-300 mb-2">Recently read / watched</div>
                            <div className="flex flex-wrap gap-1">
                                {[
                                    { value: 'any', label: 'Any' },
                                    { value: 'last7', label: '7d' },
                                    { value: 'last30', label: '30d' },
                                    { value: 'last90', label: '90d' },
                                    { value: 'last6months', label: '6mo' },
                                    { value: 'lastyear', label: '1yr' },
                                    { value: 'yeartodate', label: 'YTD' }
                                ].map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={(e) => {
                                            handleSetFilterRecent(option.value);
                                            e.currentTarget.blur();
                                        }}
                                        className={`px-2 py-1 rounded text-xs transition ${filterRecent === option.value ? '' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                                            }`}
                                        style={filterRecent === option.value ? { backgroundColor: 'var(--mt-highlight)', color: 'white' } : {}}
                                        title={option.value === 'any' ? 'Any time' :
                                            option.value === 'last7' ? 'Last 7 days' :
                                                option.value === 'last30' ? 'Last 30 days' :
                                                    option.value === 'last90' ? 'Last 90 days' :
                                                        option.value === 'last6months' ? 'Last 6 months' :
                                                            option.value === 'lastyear' ? 'Last year' :
                                                                'Year to date'}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>

                            {/* Custom Date Range */}
                            <div className="mt-3">
                                <div className="text-sm text-slate-300 mb-2">Custom date range</div>
                                <div className="flex flex-wrap gap-2 items-center">
                                    <input
                                        type="date"
                                        value={filterStartDate || ''}
                                        onChange={(e) => setFilterStartDate(e.target.value)}
                                        className="flex-1 min-w-0 px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-200"
                                        placeholder="Start date"
                                    />
                                    <span className="text-slate-400 text-sm flex-shrink-0">to</span>
                                    <input
                                        type="date"
                                        value={filterEndDate || ''}
                                        onChange={(e) => setFilterEndDate(e.target.value)}
                                        className="flex-1 min-w-0 px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-200"
                                        placeholder="End date"
                                    />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            handleSetFilterRecent('customdaterange');
                                            e.currentTarget.blur();
                                        }}
                                        className={`px-3 py-1 rounded-lg text-sm flex-shrink-0 ${filterRecent === 'customdaterange' ? '' : 'bg-slate-700/50'}`}
                                        style={filterRecent === 'customdaterange' ? { backgroundColor: 'var(--mt-highlight)', color: 'white' } : {}}
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Additional Filters */}
                        <div>
                            <div className="text-sm text-slate-300 mb-2">Additional filters</div>
                            <div className="flex flex-col gap-1 md:gap-2">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={filterHasReview.withReview}
                                        onChange={(e) => {
                                            setFilterHasReview({
                                                ...filterHasReview,
                                                withReview: e.target.checked
                                            });
                                        }}
                                        className="min-w-[16px] min-h-[16px]"
                                    />
                                    With review
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={filterHasReview.withoutReview}
                                        onChange={(e) => {
                                            setFilterHasReview({
                                                ...filterHasReview,
                                                withoutReview: e.target.checked
                                            });
                                        }}
                                        className="min-w-[16px] min-h-[16px]"
                                    />
                                    Without review
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={filterHasCover.withCover}
                                        onChange={(e) => {
                                            setFilterHasCover({
                                                ...filterHasCover,
                                                withCover: e.target.checked
                                            });
                                        }}
                                        className="min-w-[16px] min-h-[16px]"
                                    />
                                    With cover
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={filterHasCover.withoutCover}
                                        onChange={(e) => {
                                            setFilterHasCover({
                                                ...filterHasCover,
                                                withoutCover: e.target.checked
                                            });
                                        }}
                                        className="min-w-[16px] min-h-[16px]"
                                    />
                                    Without cover
                                </label>
                            </div>
                        </div>

                        {/* Tags Filter */}
                        <div>
                            <div className="text-sm text-slate-300 mb-2">Tags</div>
                            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                                {allTags.length === 0 ? (
                                    <div className="text-sm text-slate-400">No tags available</div>
                                ) : (
                                    allTags.map(tag => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={(e) => {
                                                toggleTagFilter(tag);
                                                e.currentTarget.blur();
                                            }}
                                            className={`px-3 py-1 rounded-full text-sm transition ${filterTags.includes(tag) ? '' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                                                }`}
                                            style={filterTags.includes(tag) ? { backgroundColor: 'var(--mt-highlight)', color: 'white' } : {}}
                                        >
                                            {tag}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Clear Filters Button */}
                    <div className="flex justify-end mt-4 pt-4 border-t border-slate-700">
                        <button
                            type="button"
                            onClick={(e) => {
                                clearFilters();
                                e.currentTarget.blur();
                            }}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition text-sm font-medium"
                            title="Clear all filters"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default FilterModal;
