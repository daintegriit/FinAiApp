// =====================================================
// 💎 FINAI — CATEGORY API SERVICE
// =====================================================

import {
  apiGet,
  apiPost,
  apiDelete,
  apiPatch,
} from "./api";

import type {
  Category,
} from "../types/financial";

export type CategoryCreatePayload = {
  user_id: string;
  name: string;
  icon?: string | null;
  budget?: number;
  spent?: number;
  is_default?: boolean;
};

/* =====================================================
   GET ALL CATEGORIES
===================================================== */

export async function fetchCategories(
  userId: string
): Promise<Category[]> {
  return apiGet<Category[]>(
    `/categories?user_id=${userId}`
  );
}

/* =====================================================
   CREATE CATEGORY
===================================================== */

export async function createCategory(
  category: CategoryCreatePayload
): Promise<Category> {
  return apiPost<Category, CategoryCreatePayload>(
    "/categories",
    category
  );
}

/* =====================================================
   UPDATE CATEGORY
===================================================== */

export async function updateCategory(
  id: string,
  userId: string,
  updates: Partial<Category>
): Promise<Category> {

  return apiPatch<Category, Partial<Category>>(
    `/categories/${id}?user_id=${userId}`,
    updates
  );
}

/* =====================================================
   DELETE CATEGORY
===================================================== */

export async function deleteCategory(
  id: string,
  userId: string
): Promise<unknown> {

  return apiDelete(
    `/categories/${id}?user_id=${userId}`
  );
}