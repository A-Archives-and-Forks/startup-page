/*eslint-disable*/
import { useNavigate } from "react-router-dom";
import { useSettingsStore } from "@/features/settings/stores";
import ReadView from "@/features/resourceVault/components/ReadView";
import { normalizeResourceVaultItems } from "@/features/resourceVault/utils";

export default function ResourceVaultPage() {
  const navigate = useNavigate();
  const settings = useSettingsStore((state) => state.settings);
  const persistSettingsToStore = useSettingsStore((state) => state.persistSettings);

  const persistSettings = async (nextSettings: any) => {
    await persistSettingsToStore(nextSettings);
  };

  const handleAddReadItem = async (item: any) => {
    const current = useSettingsStore.getState().settings;
    const items = Array.isArray(current.readItems) ? current.readItems : [];
    const nextItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: item.title,
      description: item.description,
      url: item.url,
      tag: item.tag,
      status: "todo",
      createdAt: new Date().toISOString(),
    };
    await persistSettings({ ...current, readItems: [nextItem, ...items] });
  };

  const handleToggleReadItem = async (itemId: string) => {
    const current = useSettingsStore.getState().settings;
    const items = Array.isArray(current.readItems) ? current.readItems : [];
    await persistSettings({
      ...current,
      readItems: items.map((item: any) =>
        item.id === itemId
          ? {
              ...item,
              status: item.status === "done" ? "todo" : "done",
              completedAt: item.status === "done" ? null : new Date().toISOString(),
            }
          : item,
      ),
    });
  };

  const handleUpdateReadItem = async (itemId: string, nextItem: any) => {
    const current = useSettingsStore.getState().settings;
    const items = Array.isArray(current.readItems) ? current.readItems : [];
    await persistSettings({
      ...current,
      readItems: items.map((item: any) =>
        item.id === itemId
          ? {
              ...item,
              title: nextItem.title,
              description: nextItem.description,
              url: nextItem.url,
              tag: nextItem.tag,
            }
          : item,
      ),
    });
  };

  const handleDeleteReadItem = async (itemId: string) => {
    const current = useSettingsStore.getState().settings;
    const items = Array.isArray(current.readItems) ? current.readItems : [];
    await persistSettings({
      ...current,
      readItems: items.filter((item: any) => item.id !== itemId),
    });
  };

  const handleImportReadItems = async (items: any) => {
    const current = useSettingsStore.getState().settings;
    await persistSettings({ ...current, readItems: normalizeResourceVaultItems(items) });
  };

  const handleExportReadItems = () => {
    const current = useSettingsStore.getState().settings;
    const items = normalizeResourceVaultItems(current.readItems);
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      items,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `startup-page-resource-vault-${date}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <ReadView
      items={settings.readItems}
      onBack={() => navigate("/")}
      onAddItem={handleAddReadItem}
      onExportItems={handleExportReadItems}
      onImportItems={handleImportReadItems}
      onToggleItem={handleToggleReadItem}
      onUpdateItem={handleUpdateReadItem}
      onDeleteItem={handleDeleteReadItem}
    />
  );
}
