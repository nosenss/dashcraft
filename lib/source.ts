import "server-only";
import * as demo from "./demo";
import * as livedune from "./livedune/client";

// Демо-режим: DEMO_MODE=1 или нет токена Livedune — тогда показываем вымышленные данные
export const isDemo = () => process.env.DEMO_MODE === "1" || !process.env.LIVEDUNE_TOKEN;

const source = () => (isDemo() ? demo : livedune);

export const listAccounts = () => source().listAccounts();
export const getHistory = (id: number, from: string, to: string) => source().getHistory(id, from, to);
export const getPosts = (id: number, from: string, to: string) => source().getPosts(id, from, to);

// Название в шапке: DASHBOARD_TITLE, в демо — вымышленный бренд
export const brandName = () => process.env.DASHBOARD_TITLE || (isDemo() ? "Кофейня «Зерно»" : "Дашкрафт");
