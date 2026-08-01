import { useState, useCallback, useEffect } from 'react';

interface UseMenuNavigationOptions {
  itemCount: number;
  onSelect?: (index: number) => void;
  initialIndex?: number;
}

export function useMenuNavigation({
  itemCount,
  onSelect,
  initialIndex = 0,
}: UseMenuNavigationOptions) {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp': {
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev <= 0 ? itemCount - 1 : prev - 1,
          );
          break;
        }
        case 'ArrowDown': {
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev >= itemCount - 1 ? 0 : prev + 1,
          );
          break;
        }
        case 'Enter': {
          event.preventDefault();
          onSelect?.(selectedIndex);
          break;
        }
      }
    },
    [itemCount, selectedIndex, onSelect],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { selectedIndex, setSelectedIndex };
}
