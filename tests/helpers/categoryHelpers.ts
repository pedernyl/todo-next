import { CATEGORY_DROPDOWN_IDS } from '@/constants/dropdowns/categoryDropDown';

export async function selectCategory(page: import('@playwright/test').Page, categoryId: string) {
  await page.getByTestId(CATEGORY_DROPDOWN_IDS.TRIGGER_BUTTON).click();
  await page.getByTestId(CATEGORY_DROPDOWN_IDS.CATEGORY_OPTION(categoryId)).click();
}
