import { Button } from '@/components/ui/button';
import { Category } from '../backend';

interface CategoryFilterProps {
  selectedCategory: Category | 'all';
  onCategoryChange: (category: Category | 'all') => void;
}

const categories: Array<{ value: Category | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: Category.music, label: 'Music' },
  { value: Category.gaming, label: 'Gaming' },
  { value: Category.education, label: 'Education' },
  { value: Category.vlog, label: 'Vlog' },
  { value: Category.comedy, label: 'Comedy' },
  { value: Category.other, label: 'Other' },
];

export default function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((cat) => (
        <Button
          key={cat.value}
          variant={selectedCategory === cat.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onCategoryChange(cat.value)}
          className="whitespace-nowrap"
        >
          {cat.label}
        </Button>
      ))}
    </div>
  );
}
