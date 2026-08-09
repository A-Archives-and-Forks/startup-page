/*eslint-disable*/
import React from "react";
import { useNavigate } from "react-router-dom";
import { useSettingsStore } from "@/features/settings/stores";
import BookmarkView from "@/features/bookmarks/components/BookmarkView";
import PaperPageShell from "@/components/layout/PaperPageShell";
import vaultPreviewBg from "@/assets/media/vault-preview-bg.jpg";

const BOOKMARK_CATEGORY_KEY = "startup-page.active-bookmark-category";

function readStoredBookmarkCategory(): string | null {
  return window.localStorage?.getItem(BOOKMARK_CATEGORY_KEY) ?? null;
}

export default function BookmarksPage() {
  const navigate = useNavigate();
  const settings = useSettingsStore((state) => state.settings);
  const bookmarkGroups = Array.isArray(settings.bookmark) ? settings.bookmark : [];
  const ui = settings.ui || {};

  const [activeBookmarkCategory] = React.useState<string | null>(readStoredBookmarkCategory);

  return (
    <PaperPageShell backgroundImage={vaultPreviewBg}>
      <BookmarkView
        bookmarks={bookmarkGroups}
        activeCategoryId={activeBookmarkCategory}
        onBack={() => navigate("/")}
        pillSize={ui.bookmarkPillSize}
      />
    </PaperPageShell>
  );
}
