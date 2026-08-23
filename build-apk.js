const { GenerateApp } = require("hbh-web2app");

GenerateApp({
  appName: "BoutiqueOS",
  packageName: "com.boutiqueos.app",
  asset: "https://botiquemanagementsystem.vercel.app/",
  appIcon: "C:/Users/Nehemiah/Desktop/AppIcons/appstore.png",
  versionCode: 1,
  versionName: "1.0.0"
})
.then(() => {
  console.log("✅ APK built successfully!");
})
.catch((error) => {
  console.error("❌ Error building APK:", error);
});