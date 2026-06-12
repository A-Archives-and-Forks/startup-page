/*eslint-disable*/
import React from "react";
import {
  HiChevronLeft,
  HiChevronRight,
  HiMinus,
  HiPencil,
  HiPlus,
  HiTrash,
} from "react-icons/hi2";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  faviconFallbackLabel,
  faviconSrcSet,
  faviconUrl,
  isSelfHostedUrl,
  LocalServiceStatus,
} from "@/features/bookmarks/components/Bookmark";

const detectBookmarkBrowser = () => {
  if (typeof navigator === "undefined") return "your browser";
  const ua = navigator.userAgent || "";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/chrome|crios/i.test(ua) && !/edg|opr|opera/i.test(ua)) return "Chrome";
  if (/edg/i.test(ua)) return "Edge";
  if (/opr|opera/i.test(ua)) return "Opera";
  if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return "Safari";
  return "your browser";
};

export function countBookmarksInGroup(group: any): number {
  return (
    (Array.isArray(group?.content) ? group.content.length : 0) +
    (Array.isArray(group?.children)
      ? group.children.reduce((total: number, child: any) => total + countBookmarksInGroup(child), 0)
      : 0)
  );
}

const getGroupCollapseKey = (path: any[]) => path.join(" / ");

function escapeBookmarkHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function createBookmarksExportHtml(groups: any[]) {
  function renderGroup(group: any, depth = 1): string {
    const indent = "    ".repeat(depth);
    const childIndent = "    ".repeat(depth + 1);
    const content = Array.isArray(group.content) ? group.content : [];
    const children = Array.isArray(group.children) ? group.children : [];

    return [
      `${indent}<DT><H3>${escapeBookmarkHtml(group.title || "Bookmarks")}</H3>`,
      `${indent}<DL><p>`,
      ...content.map(
        (bookmark: any) =>
          `${childIndent}<DT><A HREF="${escapeBookmarkHtml(bookmark.url)}">${escapeBookmarkHtml(bookmark.name || bookmark.url)}</A>`,
      ),
      ...children.map((child: any) => renderGroup(child, depth + 1)),
      `${indent}</DL><p>`,
    ].join("\n");
  }

  return [
    "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    "<TITLE>Bookmarks</TITLE>",
    "<H1>Bookmarks</H1>",
    "<DL><p>",
    ...groups.map((group) => renderGroup(group)),
    "</DL><p>",
    "",
  ].join("\n");
}

export function parseBrowserBookmarksHtml(html: string) {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  const roots: any[] = [];
  const uncategorized: any = { title: "Uncategorized", content: [], children: [] };

  function getDirectBookmarkLinks(node: Element) {
    return Array.from(node.children)
      .filter((child) => child.tagName === "DT")
      .map((child) =>
        Array.from(child.children).find((grandchild) => grandchild.tagName === "A"),
      )
      .filter(Boolean)
      .map((anchor: any) => ({
        name: (anchor.textContent || anchor.href || "Bookmark").trim(),
        url: anchor.getAttribute("href") || anchor.href,
      }))
      .filter((bookmark: any) => bookmark.url);
  }

  function parseFolder(heading: Element): any {
    const folder: any = {
      title: (heading.textContent || "Imported Folder").trim(),
      content: [],
      children: [],
    };
    const dl =
      heading.parentElement?.nextElementSibling?.tagName === "DL"
        ? heading.parentElement.nextElementSibling
        : heading.nextElementSibling?.tagName === "DL"
          ? heading.nextElementSibling
          : null;

    if (!dl) return folder;

    folder.content = getDirectBookmarkLinks(dl);
    Array.from(dl.children)
      .filter((child) => child.tagName === "DT")
      .forEach((child) => {
        const childHeading = Array.from(child.children).find(
          (grandchild) => grandchild.tagName === "H3",
        );
        if (childHeading) folder.children.push(parseFolder(childHeading));
      });

    return folder;
  }

  const rootDl = document.querySelector("dl");
  if (!rootDl) return [];

  uncategorized.content = getDirectBookmarkLinks(rootDl);
  Array.from(rootDl.children)
    .filter((child) => child.tagName === "DT")
    .forEach((child) => {
      const heading = Array.from(child.children).find(
        (grandchild) => grandchild.tagName === "H3",
      );
      if (heading) roots.push(parseFolder(heading));
    });

  if (uncategorized.content.length) roots.unshift(uncategorized);

  return roots.filter((group) => countBookmarksInGroup(group) > 0);
}

interface BookmarkViewProps {
  bookmarks: any[];
  activeCategoryIndex: number | null;
  onBack: () => void;
  onAddBookmark: (categoryPath: any, bookmark: any) => Promise<void>;
  onRemoveBookmark: (categoryPath: any, bookmarkIndex: number) => Promise<void>;
  onUpdateBookmark: (categoryPath: any, bookmarkIndex: number, bookmark: any) => Promise<void>;
  onAddCategory: (title: string, parentPath: any) => Promise<void>;
  onRenameCategory: (categoryPath: any, title: string) => Promise<void>;
  onDeleteCategory: (categoryPath: any) => Promise<void>;
  onMoveCategory: (categoryIndex: number, direction: number) => Promise<void>;
  onMoveBookmark: (categoryIndex: any, bookmarkIndex: number, direction: number) => Promise<void>;
  onReorderCategory: (fromIndex: number, toIndex: number) => Promise<void>;
  onReorderBookmark: (
    fromCategoryIndex: any,
    fromBookmarkIndex: number,
    toCategoryIndex: any,
    toBookmarkIndex: number,
  ) => Promise<void>;
  onImportBookmarks: (groups: any[]) => Promise<void>;
  onExportBookmarks: () => void;
  pillSize?: number;
}

export default function BookmarkView({
  bookmarks,
  activeCategoryIndex,
  onBack,
  onAddBookmark,
  onRemoveBookmark,
  onUpdateBookmark,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onMoveCategory,
  onMoveBookmark,
  onReorderCategory,
  onReorderBookmark,
  onImportBookmarks,
  onExportBookmarks,
  pillSize = 3.25,
}: BookmarkViewProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const detectedBrowser = React.useMemo(() => detectBookmarkBrowser(), []);
  const [addOpen, setAddOpen] = React.useState(false);
  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const [editingBookmark, setEditingBookmark] = React.useState<any>(null);
  const [editingCategory, setEditingCategory] = React.useState<any>(null);
  const [categoryDraft, setCategoryDraft] = React.useState("");
  const [categoryParentPath, setCategoryParentPath] = React.useState("");
  const [collapsedCategories, setCollapsedCategories] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [draggedItem, setDraggedItem] = React.useState<any>(null);
  const [dragOverItem, setDragOverItem] = React.useState<any>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [importError, setImportError] = React.useState("");
  const [draggingImport, setDraggingImport] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState({
    categoryPath: String(activeCategoryIndex ?? 0),
    name: "",
    url: "",
  });

  React.useEffect(() => {
    setDraft((prev) => ({
      ...prev,
      categoryPath: String(activeCategoryIndex ?? prev.categoryPath ?? 0),
    }));
  }, [activeCategoryIndex]);

  React.useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const orderedBookmarks = React.useMemo(() => {
    const active = bookmarks[activeCategoryIndex!];
    if (!active) {
      return bookmarks.map((group, index) => ({ ...group, originalIndex: index }));
    }
    return [
      { ...active, originalIndex: activeCategoryIndex },
      ...bookmarks
        .map((group, index) => ({ ...group, originalIndex: index }))
        .filter((group) => group.originalIndex !== activeCategoryIndex),
    ];
  }, [bookmarks, activeCategoryIndex]);

  const serializeCategoryPath = (path: any) =>
    (Array.isArray(path) ? path : [path]).join(".");
  const parseCategoryPath = (value: any) =>
    String(value)
      .split(".")
      .map((part) => Number(part))
      .filter((part) => Number.isInteger(part));
  const categoryPathsMatch = (left: any, right: any) =>
    serializeCategoryPath(left) === serializeCategoryPath(right);
  const getCategoryPillClass = (isCollapsed: boolean, nested = false) =>
    isCollapsed
      ? "bg-amber-400 font-semibold text-slate-950 ring-2 ring-amber-100/80"
      : nested
        ? "bg-cyan-400 font-semibold text-slate-950 ring-2 ring-cyan-100/80"
        : "bg-primary font-medium text-primary-foreground";
  const getCategoryOptions = (groups: any[], parentPath: any[] = [], depth = 0): any[] =>
    groups.flatMap((group, index) => {
      const path = [...parentPath, index];
      const children = Array.isArray(group.children) ? group.children : [];
      return [
        { label: `${"  ".repeat(depth)}${group.title}`, value: serializeCategoryPath(path) },
        ...getCategoryOptions(children, path, depth + 1),
      ];
    });
  const categoryOptions = React.useMemo(() => getCategoryOptions(bookmarks), [bookmarks]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = draft.name.trim();
    const url = draft.url.trim();
    if (!name || !url) return;

    if (editingBookmark) {
      await onUpdateBookmark(editingBookmark.categoryPath, editingBookmark.bookmarkIndex, {
        name,
        url,
      });
      setEditingBookmark(null);
    } else {
      await onAddBookmark(parseCategoryPath(draft.categoryPath), { name, url });
    }

    setDraft((prev) => ({ ...prev, name: "", url: "" }));
    setAddOpen(false);
  };

  const handleEditBookmark = (categoryPath: any, bookmarkIndex: number, bookmark: any) => {
    setEditingBookmark({ categoryPath, bookmarkIndex });
    setDraft({
      categoryPath: serializeCategoryPath(categoryPath),
      name: bookmark.name || "",
      url: bookmark.url || "",
    });
    setAddOpen(true);
  };

  const handleEditCategory = (categoryPath: any, title: string) => {
    setEditingCategory({ categoryPath, previousTitle: title });
    setCategoryDraft(title || "");
    setCategoryParentPath("");
    setAddOpen(false);
    setEditingBookmark(null);
    setCategoryOpen(true);
  };

  const handleDeleteCategory = async (categoryPath: any, title: string) => {
    await onDeleteCategory(categoryPath);
    setCollapsedCategories((current) => {
      const next = new Set(current);
      next.delete(title);
      return next;
    });

    if (editingCategory && categoryPathsMatch(editingCategory.categoryPath, categoryPath)) {
      setEditingCategory(null);
      setCategoryDraft("");
      setCategoryOpen(false);
    }
  };

  const toggleCategoryCollapsed = (categoryTitle: string) => {
    setCollapsedCategories((current) => {
      const next = new Set(current);
      if (next.has(categoryTitle)) {
        next.delete(categoryTitle);
      } else {
        next.add(categoryTitle);
      }
      return next;
    });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleCategoryDrop = async (event: React.DragEvent, targetCategoryIndex: number) => {
    event.preventDefault();
    if (!draggedItem) return;

    if (draggedItem.type === "category" && draggedItem.categoryIndex !== targetCategoryIndex) {
      await onReorderCategory(draggedItem.categoryIndex, targetCategoryIndex);
    }

    if (draggedItem.type === "bookmark") {
      const targetContent = bookmarks[targetCategoryIndex]?.content || [];
      await onReorderBookmark(
        draggedItem.categoryIndex,
        draggedItem.bookmarkIndex,
        targetCategoryIndex,
        targetContent.length,
      );
    }

    handleDragEnd();
  };

  const handleBookmarkDrop = async (
    event: React.DragEvent,
    targetCategoryIndex: any,
    targetBookmarkIndex: number,
  ) => {
    event.preventDefault();
    if (draggedItem?.type !== "bookmark") {
      handleDragEnd();
      return;
    }

    await onReorderBookmark(
      draggedItem.categoryIndex,
      draggedItem.bookmarkIndex,
      targetCategoryIndex,
      targetBookmarkIndex,
    );
    handleDragEnd();
  };

  const handleAddToggle = () => {
    setEditingBookmark(null);
    setCategoryOpen(false);
    setDraft((prev) => ({
      ...prev,
      categoryPath: String(activeCategoryIndex ?? prev.categoryPath ?? 0),
      name: "",
      url: "",
    }));
    setAddOpen((open) => !open);
  };

  const showToast = (message: string) => setToast(message);

  const openImportModal = () => {
    setImportError("");
    setImportOpen(true);
  };

  const importBookmarkFile = async (file: File) => {
    if (!file) return;
    try {
      const html = await file.text();
      const importedGroups = parseBrowserBookmarksHtml(html);

      if (!importedGroups.length) {
        const message =
          "No bookmarks were found in that export file. Use your browser's HTML bookmark export.";
        setImportError(message);
        showToast(message);
        return;
      }

      await onImportBookmarks(importedGroups);
      setImportOpen(false);
      setImportError("");
      showToast(
        `Imported ${importedGroups.reduce((total, group) => total + countBookmarksInGroup(group), 0)} bookmarks.`,
      );
    } catch (_error) {
      const message =
        "Could not import that bookmarks file. Try an HTML bookmarks export from your browser.";
      setImportError(message);
      showToast(message);
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const [file] = Array.from(event.target.files || []);
    event.target.value = "";
    await importBookmarkFile(file);
  };

  const handleImportDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setDraggingImport(false);
    const [file] = Array.from(event.dataTransfer.files || []) as File[];
    await importBookmarkFile(file);
  };

  const handleCategorySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = categoryDraft.trim();
    if (!title) return;

    if (editingCategory) {
      await onRenameCategory(editingCategory.categoryPath, title);
      setCollapsedCategories((current) => {
        const next = new Set(current);
        if (next.has(editingCategory.previousTitle)) {
          next.delete(editingCategory.previousTitle);
          next.add(title);
        }
        return next;
      });
      setEditingCategory(null);
    } else {
      await onAddCategory(title, categoryParentPath ? parseCategoryPath(categoryParentPath) : null);
      setCollapsedCategories((current) => {
        const next = new Set(current);
        next.delete(title);
        return next;
      });
    }

    setCategoryDraft("");
    setCategoryParentPath("");
    setCategoryOpen(false);
  };

  const pillHeight = Math.max(2.5, Math.min(Number(pillSize) || 3.25, 5)) * 16;
  const iconWrapSize = Math.max(28, pillHeight - 14);
  const iconSize = Math.max(16, pillHeight * 0.38);
  const textSize = Math.max(14, pillHeight * 0.34);
  const gap = Math.max(8, pillHeight * 0.2);
  const pillStyle: React.CSSProperties = {
    height: `${pillHeight}px`,
    maxWidth: `${pillHeight * 5.4}px`,
    paddingLeft: `${pillHeight * 0.42}px`,
    paddingRight: `${pillHeight * 0.55}px`,
    fontSize: `${textSize}px`,
  };
  const bookmarkPillStyle: React.CSSProperties = {
    ...pillStyle,
    gap: `${gap}px`,
    paddingLeft: `${pillHeight * 0.11}px`,
  };
  const iconWrapStyle: React.CSSProperties = {
    width: `${iconWrapSize}px`,
    height: `${iconWrapSize}px`,
  };
  const addButtonStyle: React.CSSProperties = {
    width: `${pillHeight}px`,
    height: `${pillHeight}px`,
    fontSize: `${pillHeight * 0.5}px`,
  };
  const controlButtonStyle: React.CSSProperties = {
    width: `${Math.max(22, pillHeight * 0.42)}px`,
    height: `${Math.max(22, pillHeight * 0.42)}px`,
  };

  function renderNestedGroup(group: any, categoryPath: any, labelPath: any[], depth = 1) {
    const content = Array.isArray(group.content) ? group.content : [];
    const children = Array.isArray(group.children) ? group.children : [];
    const collapseKey = getGroupCollapseKey(labelPath);
    const isCollapsed = collapsedCategories.has(collapseKey);

    return (
      <React.Fragment key={collapseKey}>
        <span
          className="group/category relative inline-flex"
          style={{ marginLeft: `${Math.min(depth * 18, 72)}px` }}
        >
          <button
            type="button"
            onClick={() => toggleCategoryCollapsed(collapseKey)}
            className={`inline-flex items-center justify-between gap-2 rounded-full shadow-lg transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring ${getCategoryPillClass(isCollapsed, true)}`}
            style={pillStyle}
            title={`${isCollapsed ? "Expand" : "Collapse"} ${group.title}`}
            aria-expanded={!isCollapsed}
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <span
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-background/25 text-current"
                style={{
                  width: `${Math.max(20, iconSize * 1.05)}px`,
                  height: `${Math.max(20, iconSize * 1.05)}px`,
                }}
              >
                {isCollapsed ? (
                  <HiPlus
                    style={{
                      width: `${Math.max(12, iconSize * 0.62)}px`,
                      height: `${Math.max(12, iconSize * 0.62)}px`,
                    }}
                  />
                ) : (
                  <HiMinus
                    style={{
                      width: `${Math.max(12, iconSize * 0.62)}px`,
                      height: `${Math.max(12, iconSize * 0.62)}px`,
                    }}
                  />
                )}
              </span>
              <span className="rounded-full bg-background/35 px-2 py-0.5 text-[0.65em] uppercase tracking-wide text-current">
                Sub
              </span>
              <span className="block truncate">{group.title}</span>
            </span>
            <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-background/20 px-2 py-0.5 text-[0.72em]">
              {countBookmarksInGroup(group)}
            </span>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleEditCategory(categoryPath, group.title);
            }}
            className="absolute -right-1.5 -top-1.5 inline-flex items-center justify-center rounded-full border border-border/60 bg-card text-card-foreground opacity-0 shadow-md transition hover:bg-accent hover:text-accent-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring group-hover/category:opacity-100"
            style={controlButtonStyle}
            title={`Rename ${group.title}`}
          >
            <HiPencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleDeleteCategory(categoryPath, group.title);
            }}
            className="absolute -left-1.5 -top-1.5 inline-flex items-center justify-center rounded-full border border-border/60 bg-card text-card-foreground opacity-0 shadow-md transition hover:bg-destructive hover:text-destructive-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring group-hover/category:opacity-100"
            style={controlButtonStyle}
            title={`Delete ${group.title}`}
          >
            <HiTrash className="size-3.5" />
          </button>
        </span>

        {!isCollapsed &&
          content.map(({ name, url }: any, index: number) => {
            const iconUrl = faviconUrl(url);
            const selfHosted = isSelfHostedUrl(url);
            const bookmark = { name, url };

            return (
              <span
                key={`${collapseKey}-${url}-${index}`}
                style={{ marginLeft: `${Math.min(depth * 18, 72)}px` }}
                className="group relative inline-flex"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  setDraggedItem({
                    type: "bookmark",
                    categoryIndex: categoryPath,
                    bookmarkIndex: index,
                  });
                }}
                onDragOver={(event) => {
                  if (draggedItem?.type === "bookmark") {
                    event.preventDefault();
                    setDragOverItem({
                      type: "bookmark",
                      categoryIndex: categoryPath,
                      bookmarkIndex: index,
                    });
                  }
                }}
                onDrop={(event) => handleBookmarkDrop(event, categoryPath, index)}
                onDragEnd={handleDragEnd}
              >
                <a
                  href={url}
                  draggable={false}
                  className={`inline-flex cursor-grab items-center rounded-full bg-card text-card-foreground shadow-lg transition active:cursor-grabbing hover:bg-accent hover:text-accent-foreground ${
                    dragOverItem?.type === "bookmark" &&
                    categoryPathsMatch(dragOverItem.categoryIndex, categoryPath) &&
                    dragOverItem.bookmarkIndex === index
                      ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
                      : ""
                  }`}
                  style={bookmarkPillStyle}
                  title={url}
                >
                  <span
                    className="inline-flex shrink-0 items-center justify-center rounded-full bg-background/65"
                    style={iconWrapStyle}
                  >
                    {selfHosted ? (
                      <LocalServiceStatus url={url} className="size-4" />
                    ) : iconUrl ? (
                      <>
                        <img
                          src={iconUrl}
                          srcSet={faviconSrcSet(url)}
                          alt=""
                          className="rounded-sm object-contain"
                          style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
                          onError={(imgEvent) => {
                            imgEvent.currentTarget.style.display = "none";
                            imgEvent.currentTarget.nextElementSibling?.removeAttribute("hidden");
                          }}
                        />
                        <span
                          hidden
                          className="bookmark-favicon-fallback"
                          style={{
                            width: `${iconSize}px`,
                            height: `${iconSize}px`,
                            fontSize: `${Math.max(10, iconSize * 0.48)}px`,
                          }}
                        >
                          {faviconFallbackLabel(name, url)}
                        </span>
                      </>
                    ) : (
                      <span
                        className="bookmark-favicon-fallback"
                        style={{
                          width: `${iconSize}px`,
                          height: `${iconSize}px`,
                          fontSize: `${Math.max(10, iconSize * 0.48)}px`,
                        }}
                      >
                        {faviconFallbackLabel(name, url)}
                      </span>
                    )}
                  </span>
                  <span className="truncate font-medium">{name}</span>
                </a>
                <button
                  type="button"
                  onClick={() => onRemoveBookmark(categoryPath, index)}
                  className="absolute -left-1.5 -top-1.5 inline-flex items-center justify-center rounded-full border border-border/60 bg-card text-card-foreground opacity-0 shadow-md transition hover:bg-destructive hover:text-destructive-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring group-hover:opacity-100"
                  style={controlButtonStyle}
                  title={`Remove ${name}`}
                >
                  <HiMinus className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleEditBookmark(categoryPath, index, bookmark)}
                  className="absolute -right-1.5 -top-1.5 inline-flex items-center justify-center rounded-full border border-border/60 bg-card text-card-foreground opacity-0 shadow-md transition hover:bg-accent hover:text-accent-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring group-hover:opacity-100"
                  style={controlButtonStyle}
                  title={`Edit ${name}`}
                >
                  <HiPencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onMoveBookmark(categoryPath, index, -1)}
                  className="absolute -bottom-1.5 left-2 inline-flex items-center justify-center rounded-full border border-border/60 bg-card text-card-foreground opacity-0 shadow-md transition hover:bg-accent hover:text-accent-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring group-hover:opacity-100"
                  style={controlButtonStyle}
                  title={`Move ${name} left`}
                >
                  <HiChevronLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onMoveBookmark(categoryPath, index, 1)}
                  className="absolute -bottom-1.5 right-2 inline-flex items-center justify-center rounded-full border border-border/60 bg-card text-card-foreground opacity-0 shadow-md transition hover:bg-accent hover:text-accent-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring group-hover:opacity-100"
                  style={controlButtonStyle}
                  title={`Move ${name} right`}
                >
                  <HiChevronRight className="size-3.5" />
                </button>
              </span>
            );
          })}

        {!isCollapsed &&
          children.map((child: any, childIndex: number) =>
            renderNestedGroup(
              child,
              [...categoryPath, childIndex],
              [...labelPath, child.title],
              depth + 1,
            ),
          )}
      </React.Fragment>
    );
  }

  return (
    <div className="bookmark-vault h-screen w-full overflow-y-auto px-4 pb-16 pt-24 sm:px-6">
      <div className="bookmark-vault-header">
        <button
          type="button"
          onClick={onBack}
          className="bookmark-vault-back"
          title="Back to dashboard"
        >
          <HiChevronLeft className="size-4" />
        </button>
        <h1>Bookmark Vault:</h1>
        <div className="bookmark-vault-actions">
          <button
            type="button"
            onClick={openImportModal}
            className="bookmark-vault-button"
            title="Import browser bookmarks export"
          >
            Import
          </button>
          <button
            type="button"
            onClick={onExportBookmarks}
            className="bookmark-vault-button"
            title="Export bookmarks as browser HTML"
          >
            Export
          </button>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm,text/html"
        className="hidden"
        onChange={handleImportFile}
      />
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-xl gap-0 border-border/60 bg-background/98 p-6 pr-14 text-foreground sm:p-7 sm:pr-16">
          <DialogHeader className="pr-2">
            <DialogTitle className="font-serif text-xl">Import Bookmarks</DialogTitle>
            <DialogDescription className="leading-6">
              Select an HTML bookmarks export from {detectedBrowser}. Chrome, Firefox, Edge,
              Safari, Opera, and other Netscape-format exports are supported.
            </DialogDescription>
          </DialogHeader>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDraggingImport(true);
            }}
            onDragLeave={() => setDraggingImport(false)}
            onDrop={handleImportDrop}
            className={`mt-5 flex min-h-48 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition focus:outline-none focus:ring-2 focus:ring-ring ${
              draggingImport
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:bg-accent"
            }`}
          >
            <span className="text-base font-medium text-foreground">
              Drop bookmarks HTML here
            </span>
            <span className="mt-2 text-sm text-muted-foreground">
              or click to open your file explorer
            </span>
            <span className="mt-4 text-xs text-muted-foreground">
              Folders become categories. Subfolders become nested subcategories.
            </span>
          </button>
          {importError ? (
            <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {importError}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      {toast ? (
        <div className="fixed right-4 top-24 z-50 max-w-sm rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-card-foreground shadow-xl">
          {toast}
        </div>
      ) : null}

      <div className="bookmark-vault-list">
        {orderedBookmarks.map((group) => {
          const content = Array.isArray(group.content) ? group.content : [];
          const children = Array.isArray(group.children) ? group.children : [];
          const isCollapsed = collapsedCategories.has(group.title);
          const categoryPath = [group.originalIndex];

          return (
            <React.Fragment key={`${group.title}-${group.originalIndex}`}>
              <span
                className="group/category relative inline-flex"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  setDraggedItem({ type: "category", categoryIndex: group.originalIndex });
                }}
                onDragOver={(event) => {
                  if (draggedItem) {
                    event.preventDefault();
                    setDragOverItem({ type: "category", categoryIndex: group.originalIndex });
                  }
                }}
                onDrop={(event) => handleCategoryDrop(event, group.originalIndex)}
                onDragEnd={handleDragEnd}
              >
                <button
                  type="button"
                  onClick={() => {
                    setDraft((prev) => ({
                      ...prev,
                      categoryPath: serializeCategoryPath(categoryPath),
                    }));
                    toggleCategoryCollapsed(group.title);
                  }}
                  className={`inline-flex cursor-grab items-center justify-between gap-2 rounded-full shadow-lg transition active:cursor-grabbing hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring ${getCategoryPillClass(isCollapsed)} ${
                    dragOverItem?.type === "category" &&
                    dragOverItem.categoryIndex === group.originalIndex
                      ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
                      : ""
                  }`}
                  style={pillStyle}
                  title={`${isCollapsed ? "Expand" : "Collapse"} ${group.title}`}
                  aria-expanded={!isCollapsed}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span
                      className="inline-flex shrink-0 items-center justify-center rounded-full bg-background/25 text-current"
                      style={{
                        width: `${Math.max(20, iconSize * 1.05)}px`,
                        height: `${Math.max(20, iconSize * 1.05)}px`,
                      }}
                    >
                      {isCollapsed ? (
                        <HiPlus
                          style={{
                            width: `${Math.max(12, iconSize * 0.62)}px`,
                            height: `${Math.max(12, iconSize * 0.62)}px`,
                          }}
                        />
                      ) : (
                        <HiMinus
                          style={{
                            width: `${Math.max(12, iconSize * 0.62)}px`,
                            height: `${Math.max(12, iconSize * 0.62)}px`,
                          }}
                        />
                      )}
                    </span>
                    <span className="block truncate">{group.title}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-background/20 px-2 py-0.5 text-[0.72em]">
                    {countBookmarksInGroup(group)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoveCategory(group.originalIndex, -1);
                  }}
                  className="absolute -left-1.5 -top-1.5 inline-flex items-center justify-center rounded-full border border-border/60 bg-card text-card-foreground opacity-0 shadow-md transition hover:bg-accent hover:text-accent-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring group-hover/category:opacity-100"
                  style={controlButtonStyle}
                  title={`Move ${group.title} left`}
                >
                  <HiChevronLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoveCategory(group.originalIndex, 1);
                  }}
                  className="absolute -right-1.5 -top-1.5 inline-flex items-center justify-center rounded-full border border-border/60 bg-card text-card-foreground opacity-0 shadow-md transition hover:bg-accent hover:text-accent-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring group-hover/category:opacity-100"
                  style={controlButtonStyle}
                  title={`Move ${group.title} right`}
                >
                  <HiChevronRight className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleEditCategory(categoryPath, group.title);
                  }}
                  className="absolute -bottom-1.5 right-2 inline-flex items-center justify-center rounded-full border border-border/60 bg-card text-card-foreground opacity-0 shadow-md transition hover:bg-accent hover:text-accent-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring group-hover/category:opacity-100"
                  style={controlButtonStyle}
                  title={`Rename ${group.title}`}
                >
                  <HiPencil className="size-3.5" />
                </button>
                {bookmarks.length > 1 ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteCategory(categoryPath, group.title);
                    }}
                    className="absolute -bottom-1.5 left-2 inline-flex items-center justify-center rounded-full border border-border/60 bg-card text-card-foreground opacity-0 shadow-md transition hover:bg-destructive hover:text-destructive-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring group-hover/category:opacity-100"
                    style={controlButtonStyle}
                    title={`Delete ${group.title}`}
                  >
                    <HiTrash className="size-3.5" />
                  </button>
                ) : null}
              </span>

              {!isCollapsed &&
                content.map(({ name, url }: any, index: number) => {
                  const iconUrl = faviconUrl(url);
                  const selfHosted = isSelfHostedUrl(url);
                  const bookmark = { name, url };

                  return (
                    <span
                      key={`${url}-${index}`}
                      className="group relative inline-flex"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        setDraggedItem({
                          type: "bookmark",
                          categoryIndex: group.originalIndex,
                          bookmarkIndex: index,
                        });
                      }}
                      onDragOver={(event) => {
                        if (draggedItem?.type === "bookmark") {
                          event.preventDefault();
                          setDragOverItem({
                            type: "bookmark",
                            categoryIndex: group.originalIndex,
                            bookmarkIndex: index,
                          });
                        }
                      }}
                      onDrop={(event) => handleBookmarkDrop(event, group.originalIndex, index)}
                      onDragEnd={handleDragEnd}
                    >
                      <a
                        href={url}
                        draggable={false}
                        className={`inline-flex cursor-grab items-center rounded-full bg-card text-card-foreground shadow-lg transition active:cursor-grabbing hover:bg-accent hover:text-accent-foreground ${
                          dragOverItem?.type === "bookmark" &&
                          dragOverItem.categoryIndex === group.originalIndex &&
                          dragOverItem.bookmarkIndex === index
                            ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
                            : ""
                        }`}
                        style={bookmarkPillStyle}
                        title={url}
                      >
                        <span
                          className="inline-flex shrink-0 items-center justify-center rounded-full bg-background/65"
                          style={iconWrapStyle}
                        >
                          {selfHosted ? (
                            <LocalServiceStatus url={url} className="size-4" />
                          ) : iconUrl ? (
                            <>
                              <img
                                src={iconUrl}
                                srcSet={faviconSrcSet(url)}
                                alt=""
                                className="rounded-sm object-contain"
                                style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                  event.currentTarget.nextElementSibling?.removeAttribute("hidden");
                                }}
                              />
                              <span
                                hidden
                                className="bookmark-favicon-fallback"
                                style={{
                                  width: `${iconSize}px`,
                                  height: `${iconSize}px`,
                                  fontSize: `${Math.max(10, iconSize * 0.48)}px`,
                                }}
                              >
                                {faviconFallbackLabel(name, url)}
                              </span>
                            </>
                          ) : (
                            <span
                              className="bookmark-favicon-fallback"
                              style={{
                                width: `${iconSize}px`,
                                height: `${iconSize}px`,
                                fontSize: `${Math.max(10, iconSize * 0.48)}px`,
                              }}
                            >
                              {faviconFallbackLabel(name, url)}
                            </span>
                          )}
                        </span>
                        <span className="truncate font-medium">{name}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => onRemoveBookmark(categoryPath, index)}
                        className="absolute -left-1.5 -top-1.5 inline-flex items-center justify-center rounded-full border border-border/60 bg-card text-card-foreground opacity-0 shadow-md transition hover:bg-destructive hover:text-destructive-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring group-hover:opacity-100"
                        style={controlButtonStyle}
                        title={`Remove ${name}`}
                      >
                        <HiMinus className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditBookmark(categoryPath, index, bookmark)}
                        className="absolute -right-1.5 -top-1.5 inline-flex items-center justify-center rounded-full border border-border/60 bg-card text-card-foreground opacity-0 shadow-md transition hover:bg-accent hover:text-accent-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring group-hover:opacity-100"
                        style={controlButtonStyle}
                        title={`Edit ${name}`}
                      >
                        <HiPencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveBookmark(group.originalIndex, index, -1)}
                        className="absolute -bottom-1.5 left-2 inline-flex items-center justify-center rounded-full border border-border/60 bg-card text-card-foreground opacity-0 shadow-md transition hover:bg-accent hover:text-accent-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring group-hover:opacity-100"
                        style={controlButtonStyle}
                        title={`Move ${name} left`}
                      >
                        <HiChevronLeft className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveBookmark(group.originalIndex, index, 1)}
                        className="absolute -bottom-1.5 right-2 inline-flex items-center justify-center rounded-full border border-border/60 bg-card text-card-foreground opacity-0 shadow-md transition hover:bg-accent hover:text-accent-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring group-hover:opacity-100"
                        style={controlButtonStyle}
                        title={`Move ${name} right`}
                      >
                        <HiChevronRight className="size-3.5" />
                      </button>
                    </span>
                  );
                })}
              {!isCollapsed &&
                children.map((child: any, childIndex: number) =>
                  renderNestedGroup(
                    child,
                    [group.originalIndex, childIndex],
                    [group.title, child.title],
                  ),
                )}
            </React.Fragment>
          );
        })}

        <button
          type="button"
          onClick={handleAddToggle}
          className="bookmark-vault-add"
          style={addButtonStyle}
          title="Add bookmark"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            setAddOpen(false);
            setEditingBookmark(null);
            setEditingCategory(null);
            setCategoryDraft("");
            setCategoryParentPath("");
            setCategoryOpen((open) => !open);
          }}
          className="bookmark-vault-category-add"
          style={{ height: `${pillHeight}px`, fontSize: `${textSize}px` }}
          title="Add category"
        >
          Category +
        </button>
      </div>

      {categoryOpen ? (
        <form onSubmit={handleCategorySubmit} className="bookmark-vault-form max-w-xl">
          <label className="grid min-w-64 flex-1 gap-1 text-xs text-muted-foreground">
            {editingCategory ? "Rename Category" : "Category Name"}
            <input
              value={categoryDraft}
              onChange={(event) => setCategoryDraft(event.target.value)}
              className="h-11 rounded-full border border-input bg-background px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder="Work"
            />
          </label>
          {!editingCategory ? (
            <label className="grid min-w-52 gap-1 text-xs text-muted-foreground">
              Parent
              <select
                value={categoryParentPath}
                onChange={(event) => setCategoryParentPath(event.target.value)}
                className="h-11 rounded-full border border-input bg-background px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Top level</option>
                {categoryOptions.map((option: any) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="submit"
            className="h-11 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            {editingCategory ? "Save" : "Add"}
          </button>
        </form>
      ) : null}

      {addOpen ? (
        <form onSubmit={handleSubmit} className="bookmark-vault-form max-w-4xl">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Category
            <select
              value={draft.categoryPath}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, categoryPath: event.target.value }))
              }
              className="h-11 rounded-full border border-input bg-background px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              {categoryOptions.map((option: any) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid min-w-48 flex-1 gap-1 text-xs text-muted-foreground">
            Name
            <input
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              className="h-11 rounded-full border border-input bg-background px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder="Github"
            />
          </label>

          <label className="grid min-w-64 flex-1 gap-1 text-xs text-muted-foreground">
            URL
            <input
              value={draft.url}
              onChange={(event) => setDraft((prev) => ({ ...prev, url: event.target.value }))}
              className="h-11 rounded-full border border-input bg-background px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder="https://github.com"
            />
          </label>

          <button
            type="submit"
            className="h-11 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            {editingBookmark ? "Save" : "Add"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
