const express = require("express");
const router = express.Router();
const hospitalController = require("../controllers/hospitalController");
// const dispatchController = require("../controllers/dispatchController");
const { catchErrors } = require("../handlers/errorHandlers");

// router.get("/dispatch", catchErrors(dispatchController.getDispatches));
// router.post("/dispatch", catchErrors(dispatchController.broadcastDispatch));

router.get("/hospitals", catchErrors(hospitalController.getHospitals));
router.get("/api/hospitals", catchErrors(hospitalController.getHospitalsJson));

module.exports = router;
