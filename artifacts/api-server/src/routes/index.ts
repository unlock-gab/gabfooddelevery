import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import citiesRouter from "./cities";
import restaurantsRouter from "./restaurants";
import menusRouter from "./menus";
import cartRouter from "./cart";
import ordersRouter from "./orders";
import dispatchRouter from "./dispatch";
import adminRouter from "./admin";
import profileRouter from "./profile";
import promoRouter from "./promo";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(citiesRouter);
router.use(restaurantsRouter);
router.use(menusRouter);
router.use(cartRouter);
router.use(ordersRouter);
router.use(dispatchRouter);
router.use(adminRouter);
router.use(profileRouter);
router.use(promoRouter);

export default router;
