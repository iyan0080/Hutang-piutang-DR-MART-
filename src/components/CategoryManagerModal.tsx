import React, { useState } from 'react';
import { 
  X, 
  FolderPlus, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Layers
} from 'lucide-react';
import { CustomCategoryItem } from '../types';
import { 
  saveCategoryToFirebase, 
  deleteCategoryFromFirebase 
} from '../lib/firestoreService';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CustomCategoryItem[];
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');

  if (!isOpen) return null;

  // Handle Category Add
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) {
      setCategoryError('Nama kategori tidak boleh kosong');
      return;
    }
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      setCategoryError('Kategori dengan nama ini sudah ada');
      return;
    }

    const id = `cat-${Date.now().toString().slice(-6)}`;
    await saveCategoryToFirebase({ id, name });
    setNewCategoryName('');
    setCategoryError('');
  };

  // Handle Category Save Edit
  const handleSaveEditCategory = async (id: string) => {
    const name = editingCategoryName.trim();
    if (!name) return;
    await saveCategoryToFirebase({ id, name });
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  // Handle Category Delete
  const handleDeleteCategory = async (id: string, name: string) => {
    if (confirm(`Hapus kategori "${name}"? Data transaksi dengan kategori ini tetap ada namun kategori ini akan dihapus dari opsi pilihan.`)) {
      await deleteCategoryFromFirebase(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-teal-600 text-white rounded-xl shadow-xs">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Kelola Kategori Transaksi
              </h3>
              <p className="text-xs text-slate-500">
                Sinkronisasi otomatis secara real-time ke cloud Firebase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          {/* Add category form */}
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Nama kategori baru (contoh: Operasional Toko, Rekanan)..."
                value={newCategoryName}
                onChange={(e) => {
                  setNewCategoryName(e.target.value);
                  setCategoryError('');
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  categoryError ? 'border-rose-400' : 'border-slate-200'
                }`}
              />
              {categoryError && (
                <p className="text-xs text-rose-500 mt-1">{categoryError}</p>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah</span>
            </button>
          </form>

          {/* Categories List */}
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {categories.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Belum ada kategori kustom. Silakan buat kategori baru di atas.
              </div>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs sm:text-sm"
                >
                  {editingCategoryId === cat.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        className="flex-1 px-2.5 py-1 bg-white border border-teal-500 rounded-lg text-xs sm:text-sm focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEditCategory(cat.id)}
                        className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer"
                        title="Simpan"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingCategoryId(null);
                          setEditingCategoryName('');
                        }}
                        className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors cursor-pointer"
                        title="Batal"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0"></span>
                        <span className="font-semibold text-slate-800">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCategoryId(cat.id);
                            setEditingCategoryName(cat.name);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                          title="Edit nama kategori"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus kategori"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
          >
            Selesai
          </button>
        </div>

      </div>
    </div>
  );
};
