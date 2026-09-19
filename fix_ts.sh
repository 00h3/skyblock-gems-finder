sed -i 's/parseInt(activeTab.toString())/parseInt(activeTab as string)/g' src/components/AdvancedInventoryModal.tsx
sed -i 's/parseInt(activeTab)/parseInt(activeTab as string)/g' src/components/AdvancedInventoryModal.tsx
