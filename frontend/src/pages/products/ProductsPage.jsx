import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Plus } from 'lucide-react';
import client from '../../api/client';
import {
  Button, PageHeader, Table, Badge, PageTransition, SearchInput,
  ConfirmButton, toast, Breadcrumbs,
} from '../../components/ui';
import ProductForm from './ProductForm';
import { Can } from '../../components/Can';
import { useFieldPermission } from '../../hooks/useFieldPermission';
import { PERMISSIONS } from '../../utils/permissions';

const fetchProducts = async (search) => {
  const res = await client.get('/products', { params: { q: search, limit: 50 } });
  return res.data;
};

const deleteProduct = async (id) => {
  await client.delete(`/products/${id}`);
};

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const queryClient = useQueryClient();
  const { canViewProductCost } = useFieldPermission();

  const { data, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: () => fetchProducts(search),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast('تم حذف المنتج', 'success');
    },
    onError: (err) => toast(err.response?.data?.message || 'حدث خطأ', 'error'),
  });

  const handleEdit = (product) => { setEditProduct(product); setShowForm(true); };
  const handleAdd = () => { setEditProduct(null); setShowForm(true); };
  const handleClose = () => { setShowForm(false); setEditProduct(null); };

  const columns = [
    {
      key: 'name', label: 'اسم المنتج',
      render: (r) => (
        <div>
          <span className="font-medium text-gray-800 dark:text-gray-100">{r.name_ar}</span>
          <span className="text-gray-400 dark:text-gray-500 text-xs block">{r.name}</span>
        </div>
      ),
    },
    { key: 'barcode', label: 'الباركود', render: (r) => r.barcode || '—' },
    { key: 'category', label: 'التصنيف', render: (r) => r.category?.name_ar || <span className="text-gray-400">—</span> },
    ...(canViewProductCost()
      ? [{ key: 'cost_price', label: 'سعر التكلفة', render: (r) => `${r.cost_price?.toLocaleString()} ﷼` }]
      : []),
    { key: 'selling_price', label: 'سعر البيع', render: (r) => <span className="font-medium text-green-600 dark:text-green-400">{r.selling_price.toLocaleString()} ﷼</span> },
    {
      key: 'is_active', label: 'الحالة',
      render: (r) => <Badge color={r.is_active ? 'green' : 'red'}>{r.is_active ? 'نشط' : 'موقوف'}</Badge>,
    },
  ];

  return (
    <PageTransition>
      <Breadcrumbs items={[{ label: 'المنتجات', to: '/products' }, { label: 'جميع المنتجات' }]} />
      <PageHeader
        title="إدارة المنتجات"
        actions={
          <Can permission={PERMISSIONS.MANAGE_PRODUCTS}>
            <Button onClick={handleAdd}><Plus className="w-4 h-4" /> إضافة منتج</Button>
          </Can>
        }
      />

      <div className="mb-4 max-w-sm">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو الباركود..." />
      </div>

      <Table
        columns={columns}
        data={data?.data}
        isLoading={isLoading}
        emptyMessage="لا توجد منتجات"
        emptyIcon="📦"
        renderActions={(row) => (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Can permission={PERMISSIONS.MANAGE_PRODUCTS}>
              <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>تعديل</Button>
            </Can>
            <Can permission={PERMISSIONS.MANAGE_PRODUCTS}>
              <ConfirmButton
                variant="ghost-danger" size="sm"
                onConfirm={() => deleteMutation.mutate(row.id)}
                message="هل أنت متأكد من حذف المنتج؟"
              >حذف</ConfirmButton>
            </Can>
          </div>
        )}
      />

      {showForm && (
        <ProductForm
          product={editProduct}
          onClose={handleClose}
          onSuccess={() => {
            queryClient.invalidateQueries(['products']);
            handleClose();
            toast(editProduct ? 'تم تحديث المنتج' : 'تم إضافة المنتج', 'success');
          }}
        />
      )}
    </PageTransition>
  );
}
