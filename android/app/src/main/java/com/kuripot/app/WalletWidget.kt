package com.kuripot.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import android.app.PendingIntent
import org.json.JSONArray
import org.json.JSONException

class WalletWidget : AppWidgetProvider() {

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    for (id in appWidgetIds) {
      updateAppWidget(context, appWidgetManager, id)
    }
  }

  companion object {
    // Capacitor Preferences uses "_capacitorPreferences" as the SharedPreferences name
    private const val PREFS_NAME = "_capacitorPreferences"

    fun updateAppWidget(
      context: Context,
      appWidgetManager: AppWidgetManager,
      appWidgetId: Int
    ) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val totalBalance = prefs.getString("widget_totalBalance", "₱0.00") ?: "₱0.00"
      val accountsJson = prefs.getString("widget_accounts", "[]") ?: "[]"

      val views = RemoteViews(context.packageName, R.layout.widget_wallet)
      views.setTextViewText(R.id.widget_balance, totalBalance)

      // Build account summary text for marquee row
      val accountsText = buildAccountsText(accountsJson)
      views.setTextViewText(R.id.widget_accounts_summary, accountsText)

      // Tap to open app
      val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      if (launchIntent != null) {
        val pendingIntent = PendingIntent.getActivity(
          context, 0, launchIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
      }

      appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun buildAccountsText(json: String): String {
      return try {
        val arr = JSONArray(json)
        val parts = mutableListOf<String>()
        for (i in 0 until arr.length()) {
          val obj = arr.getJSONObject(i)
          val name = obj.getString("name")
          val balance = obj.getString("balance")
          parts.add("$name  $balance")
        }
        parts.joinToString("   ·   ")
      } catch (e: JSONException) {
        ""
      }
    }
  }
}
