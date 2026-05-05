import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ingredientsRouter from "./ingredients";
import stockRouter from "./stock";
import recipesRouter from "./recipes";
import suggestionsRouter from "./suggestions";
import shoppingRouter from "./shopping";
import dashboardRouter from "./dashboard";
import anthropicRouter from "./anthropic/index";
import plannerRouter from "./planner";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ingredientsRouter);
router.use(stockRouter);
router.use(recipesRouter);
router.use(suggestionsRouter);
router.use(shoppingRouter);
router.use(dashboardRouter);
router.use(anthropicRouter);
router.use(plannerRouter);

export default router;
