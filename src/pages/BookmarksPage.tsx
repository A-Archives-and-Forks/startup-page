/*eslint-disable*/
import React from "react";
import { useNavigate } from "react-router-dom";
import { useSettingsStore } from "@/features/settings/stores";
import BookmarkView, {
  countBookmarksInGroup,
  createBookmarksExportHtml,
} from "@/features/bookmarks/components/BookmarkView";
import { isSelfHostedUrl } from "@/features/bookmarks/components/Bookmark";

const BOOKMARK_CATEGORY_KEY = "startup-page.active-bookmark-category";

function readStoredBookmarkCategory(): number | null {
  const stored = window.localStorage?.getItem(BOOKMARK_CATEGORY_KEY);
  return stored === null ? null : Number(stored);
}

function normalizeBookmarkUrl(url: string): string {
  const trimmed = url.trim();
  const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed);
  return hasScheme
    ? trimmed
    : `${isSelfHostedUrl(trimmed) ? "http" : "https"}://${trimmed}`;
}

function normalizeCategoryPath(categoryPath: any): number[] {
  return (Array.isArray(categoryPath) ? categoryPath : [categoryPath])
    .map((part) => Number(part))
    .filter((part) => Number.isInteger(part));
}

function updateBookmarkGroupAtPath(groups: any[], categoryPath: any, updater: (g: any) => any): any[] {
  const [currentIndex, ...restPath] = normalizeCategoryPath(categoryPath);
  return groups.map((group, index) => {
    if (index !== currentIndex) return group;
    if (!restPath.length) return updater(group);
    return {
      ...group,
      children: updateBookmarkGroupAtPath(
        Array.isArray(group.children) ? group.children : [],
        restPath,
        updater,
      ),
    };
  });
}

function getBookmarkGroupAtPath(groups: any[], categoryPath: any): any {
  const [currentIndex, ...restPath] = normalizeCategoryPath(categoryPath);
  const group = groups[currentIndex];
  if (!group || !restPath.length) return group;
  return getBookmarkGroupAtPath(Array.isArray(group.children) ? group.children : [], restPath);
}

function removeBookmarkGroupAtPath(groups: any[], categoryPath: any): any[] {
  const [currentIndex, ...restPath] = normalizeCategoryPath(categoryPath);
  if (!restPath.length) {
    return groups.filter((_group, index) => index !== currentIndex);
  }
  return groups.map((group, index) =>
    index === currentIndex
      ? {
          ...group,
          children: removeBookmarkGroupAtPath(
            Array.isArray(group.children) ? group.children : [],
            restPath,
          ),
        }
      : group,
  );
}

function normalizeImportedBookmarkGroup(group: any): any {
  return {
    title: group.title || "Imported",
    content: (Array.isArray(group.content) ? group.content : [])
      .filter((bookmark: any) => bookmark?.name && bookmark?.url)
      .map((bookmark: any) => ({
        name: bookmark.name,
        url: normalizeBookmarkUrl(bookmark.url),
      })),
    children: (Array.isArray(group.children) ? group.children : [])
      .map(normalizeImportedBookmarkGroup)
      .filter((child: any) => countBookmarksInGroup(child) > 0),
  };
}

export default function BookmarksPage() {
  const navigate = useNavigate();
  const settings = useSettingsStore((state) => state.settings);
  const persistSettingsToStore = useSettingsStore((state) => state.persistSettings);
  const bookmarkGroups = Array.isArray(settings.bookmark) ? settings.bookmark : [];
  const ui = settings.ui || {};

  const [activeBookmarkCategory, setActiveBookmarkCategory] = React.useState<number | null>(
    readStoredBookmarkCategory,
  );

  const updateActiveBookmarkCategory = React.useCallback((categoryIndex: number | null) => {
    setActiveBookmarkCategory(categoryIndex);
    if (categoryIndex === null) {
      window.localStorage?.removeItem(BOOKMARK_CATEGORY_KEY);
    } else {
      window.localStorage?.setItem(BOOKMARK_CATEGORY_KEY, String(categoryIndex));
    }
  }, []);

  const persistSettings = async (nextSettings: any) => {
    await persistSettingsToStore(nextSettings);
  };

  const handleAddBookmark = async (categoryIndex: any, bookmark: any) => {
    const current = useSettingsStore.getState().settings;
    const groups = Array.isArray(current.bookmark) ? current.bookmark : [];
    await persistSettings({
      ...current,
      bookmark: updateBookmarkGroupAtPath(groups, categoryIndex, (group) => ({
        ...group,
        content: [
          ...(Array.isArray(group.content) ? group.content : []),
          { name: bookmark.name, url: normalizeBookmarkUrl(bookmark.url) },
        ],
      })),
    });
  };

  const handleUpdateBookmark = async (categoryIndex: any, bookmarkIndex: number, bookmark: any) => {
    const current = useSettingsStore.getState().settings;
    const groups = Array.isArray(current.bookmark) ? current.bookmark : [];
    await persistSettings({
      ...current,
      bookmark: updateBookmarkGroupAtPath(groups, categoryIndex, (group) => ({
        ...group,
        content: (Array.isArray(group.content) ? group.content : []).map(
          (item: any, idx: number) =>
            idx === bookmarkIndex
              ? { name: bookmark.name, url: normalizeBookmarkUrl(bookmark.url) }
              : item,
        ),
      })),
    });
  };

  const handleRemoveBookmark = async (categoryIndex: any, bookmarkIndex: number) => {
    const current = useSettingsStore.getState().settings;
    const groups = Array.isArray(current.bookmark) ? current.bookmark : [];
    await persistSettings({
      ...current,
      bookmark: updateBookmarkGroupAtPath(groups, categoryIndex, (group) => ({
        ...group,
        content: (Array.isArray(group.content) ? group.content : []).filter(
          (_item: any, idx: number) => idx !== bookmarkIndex,
        ),
      })),
    });
  };

  const handleAddBookmarkCategory = async (title: string, parentCategoryPath: any = null) => {
    const current = useSettingsStore.getState().settings;
    const groups = Array.isArray(current.bookmark) ? current.bookmark : [];
    const newCategory = { title, content: [], children: [] };

    if (parentCategoryPath) {
      await persistSettings({
        ...current,
        bookmark: updateBookmarkGroupAtPath(groups, parentCategoryPath, (group) => ({
          ...group,
          children: [...(Array.isArray(group.children) ? group.children : []), newCategory],
        })),
      });
      return;
    }

    updateActiveBookmarkCategory(groups.length);
    await persistSettings({ ...current, bookmark: [...groups, newCategory] });
  };

  const handleImportBookmarks = async (importedGroups: any[]) => {
    const current = useSettingsStore.getState().settings;
    const groups = Array.isArray(current.bookmark) ? current.bookmark : [];
    const normalized = importedGroups
      .map(normalizeImportedBookmarkGroup)
      .filter((group) => countBookmarksInGroup(group) > 0);

    if (!normalized.length) return;

    updateActiveBookmarkCategory(groups.length);
    await persistSettings({ ...current, bookmark: [...groups, ...normalized] });
  };

  const handleRenameBookmarkCategory = async (categoryIndex: any, title: string) => {
    const current = useSettingsStore.getState().settings;
    const groups = Array.isArray(current.bookmark) ? current.bookmark : [];
    await persistSettings({
      ...current,
      bookmark: updateBookmarkGroupAtPath(groups, categoryIndex, (group) => ({
        ...group,
        title,
      })),
    });
  };

  const handleExportBookmarks = () => {
    const current = useSettingsStore.getState().settings;
    const groups = Array.isArray(current.bookmark) ? current.bookmark : [];
    const html = createBookmarksExportHtml(groups);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `startup-page-bookmarks-${date}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleDeleteBookmarkCategory = async (categoryIndex: any) => {
    const current = useSettingsStore.getState().settings;
    const groups = Array.isArray(current.bookmark) ? current.bookmark : [];
    const currentMapping = current.layout?.bookmarkBoxCategories || [0, 1, 2, 3, 4];
    const categoryPath = normalizeCategoryPath(categoryIndex);

    if (!categoryPath.length || (categoryPath.length === 1 && groups.length <= 1)) return;

    if (categoryPath.length > 1) {
      await persistSettings({
        ...current,
        bookmark: removeBookmarkGroupAtPath(groups, categoryPath),
      });
      return;
    }

    const [topLevelIndex] = categoryPath;
    const bookmark = groups.filter((_group: any, index: number) => index !== topLevelIndex);
    const fallbackIndex = Math.min(topLevelIndex, bookmark.length - 1);
    const bookmarkBoxCategoriesNext = currentMapping.map((mappedIndex: number, boxIndex: number) => {
      if (mappedIndex === topLevelIndex) return Math.min(boxIndex, bookmark.length - 1);
      if (mappedIndex > topLevelIndex) return mappedIndex - 1;
      return Math.min(mappedIndex, bookmark.length - 1);
    });

    if (activeBookmarkCategory === topLevelIndex) {
      updateActiveBookmarkCategory(fallbackIndex);
    } else if (activeBookmarkCategory !== null && activeBookmarkCategory > topLevelIndex) {
      updateActiveBookmarkCategory(activeBookmarkCategory - 1);
    }

    await persistSettings({
      ...current,
      bookmark,
      layout: { ...current.layout, bookmarkBoxCategories: bookmarkBoxCategoriesNext },
    });
  };

  const handleMoveBookmarkCategory = async (categoryIndex: number, direction: number) => {
    const current = useSettingsStore.getState().settings;
    const groups = Array.isArray(current.bookmark) ? current.bookmark : [];
    const currentMapping = current.layout?.bookmarkBoxCategories || [0, 1, 2, 3, 4];
    const nextIndex = categoryIndex + direction;

    if (nextIndex < 0 || nextIndex >= groups.length) return;

    const bookmark = [...groups];
    [bookmark[categoryIndex], bookmark[nextIndex]] = [bookmark[nextIndex], bookmark[categoryIndex]];

    const bookmarkBoxCategoriesNext = currentMapping.map((mappedIndex: number) => {
      if (mappedIndex === categoryIndex) return nextIndex;
      if (mappedIndex === nextIndex) return categoryIndex;
      return mappedIndex;
    });

    if (activeBookmarkCategory === categoryIndex) {
      updateActiveBookmarkCategory(nextIndex);
    } else if (activeBookmarkCategory === nextIndex) {
      updateActiveBookmarkCategory(categoryIndex);
    }

    await persistSettings({
      ...current,
      bookmark,
      layout: { ...current.layout, bookmarkBoxCategories: bookmarkBoxCategoriesNext },
    });
  };

  const handleReorderBookmarkCategory = async (fromIndex: number, toIndex: number) => {
    const current = useSettingsStore.getState().settings;
    const groups = Array.isArray(current.bookmark) ? current.bookmark : [];
    const currentMapping = current.layout?.bookmarkBoxCategories || [0, 1, 2, 3, 4];

    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= groups.length ||
      toIndex >= groups.length
    )
      return;

    const orderedIndexes = groups.map((_: any, index: number) => index);
    const [movedIndex] = orderedIndexes.splice(fromIndex, 1);
    orderedIndexes.splice(toIndex, 0, movedIndex);

    const oldToNewIndex = new Map(
      orderedIndexes.map((oldIndex: number, newIndex: number) => [oldIndex, newIndex]),
    );
    const bookmark = orderedIndexes.map((oldIndex: number) => groups[oldIndex]);
    const bookmarkBoxCategoriesNext = currentMapping.map((mappedIndex: number) =>
      oldToNewIndex.has(mappedIndex) ? oldToNewIndex.get(mappedIndex) : mappedIndex,
    );

    if (oldToNewIndex.has(activeBookmarkCategory)) {
      updateActiveBookmarkCategory(oldToNewIndex.get(activeBookmarkCategory!)!);
    }

    await persistSettings({
      ...current,
      bookmark,
      layout: { ...current.layout, bookmarkBoxCategories: bookmarkBoxCategoriesNext },
    });
  };

  const handleMoveBookmark = async (categoryIndex: any, bookmarkIndex: number, direction: number) => {
    const current = useSettingsStore.getState().settings;
    const groups = Array.isArray(current.bookmark) ? current.bookmark : [];
    const group = getBookmarkGroupAtPath(groups, categoryIndex);
    const content = Array.isArray(group?.content) ? [...group.content] : [];
    const nextIndex = bookmarkIndex + direction;

    if (!group || nextIndex < 0 || nextIndex >= content.length) return;

    [content[bookmarkIndex], content[nextIndex]] = [content[nextIndex], content[bookmarkIndex]];

    await persistSettings({
      ...current,
      bookmark: updateBookmarkGroupAtPath(groups, categoryIndex, (currentGroup) => ({
        ...currentGroup,
        content,
      })),
    });
  };

  const handleReorderBookmark = async (
    fromCategoryIndex: any,
    fromBookmarkIndex: number,
    toCategoryIndex: any,
    toBookmarkIndex: number,
  ) => {
    const current = useSettingsStore.getState().settings;
    const groups = Array.isArray(current.bookmark) ? current.bookmark : [];
    const fromGroup = getBookmarkGroupAtPath(groups, fromCategoryIndex);
    const toGroup = getBookmarkGroupAtPath(groups, toCategoryIndex);
    const fromContent = Array.isArray(fromGroup?.content) ? [...fromGroup.content] : [];
    const sameCategory =
      JSON.stringify(normalizeCategoryPath(fromCategoryIndex)) ===
      JSON.stringify(normalizeCategoryPath(toCategoryIndex));
    const toContent = sameCategory
      ? fromContent
      : Array.isArray(toGroup?.content)
        ? [...toGroup.content]
        : [];

    if (!fromGroup || !toGroup || fromBookmarkIndex < 0 || fromBookmarkIndex >= fromContent.length)
      return;
    if (sameCategory && (fromBookmarkIndex === toBookmarkIndex || fromBookmarkIndex + 1 === toBookmarkIndex))
      return;

    const [movedBookmark] = fromContent.splice(fromBookmarkIndex, 1);
    const adjustedTargetIndex =
      sameCategory && toBookmarkIndex > fromBookmarkIndex ? toBookmarkIndex - 1 : toBookmarkIndex;
    const boundedTargetIndex = Math.max(0, Math.min(adjustedTargetIndex, toContent.length));
    toContent.splice(boundedTargetIndex, 0, movedBookmark);

    const bookmark = sameCategory
      ? updateBookmarkGroupAtPath(groups, fromCategoryIndex, (group) => ({
          ...group,
          content: fromContent,
        }))
      : updateBookmarkGroupAtPath(
          updateBookmarkGroupAtPath(groups, fromCategoryIndex, (group) => ({
            ...group,
            content: fromContent,
          })),
          toCategoryIndex,
          (group) => ({ ...group, content: toContent }),
        );

    await persistSettings({ ...current, bookmark });
  };

  return (
    <BookmarkView
      bookmarks={bookmarkGroups}
      activeCategoryIndex={activeBookmarkCategory}
      onBack={() => navigate("/")}
      onAddBookmark={handleAddBookmark}
      onRemoveBookmark={handleRemoveBookmark}
      onUpdateBookmark={handleUpdateBookmark}
      onAddCategory={handleAddBookmarkCategory}
      onRenameCategory={handleRenameBookmarkCategory}
      onDeleteCategory={handleDeleteBookmarkCategory}
      onMoveCategory={handleMoveBookmarkCategory}
      onMoveBookmark={handleMoveBookmark}
      onReorderCategory={handleReorderBookmarkCategory}
      onReorderBookmark={handleReorderBookmark}
      onImportBookmarks={handleImportBookmarks}
      onExportBookmarks={handleExportBookmarks}
      pillSize={ui.bookmarkPillSize}
    />
  );
}
