import React from 'react';
import { Bookmark, BookOpen, CheckCircle, PlayCircle, Layers, XCircle } from 'lucide-react';
import { STATUS_ICONS, STATUS_COLORS } from '../constants/index.js';

export const getStatusIcon = (status, className = '') => {
  const iconType = STATUS_ICONS[status];
  switch (iconType) {
    case 'bookmark':
      return <Bookmark className={className} />;
    case 'layers':
      return <Layers className={className} />;
    case 'book-open':
      return <BookOpen className={className} />;
    case 'check-circle':
      return <CheckCircle className={className} />;
    case 'play-circle':
      return <PlayCircle className={className} />;
    case 'x-circle':
      return <XCircle className={className} />;
    default:
      return <Bookmark className={className} />;
  }
};

export const getStatusColorClass = (status) => {
  const colorType = STATUS_COLORS[status];
  switch (colorType) {
    case 'blue':
      return 'bg-blue-500';
    case 'yellow':
      return 'bg-yellow-500';
    case 'green':
      return 'bg-green-500';
    case 'red':
      return 'bg-red-500';
    default:
      return 'bg-blue-500';
  }
};
