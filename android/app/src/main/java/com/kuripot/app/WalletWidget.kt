package com.kuripot.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.SharedPreferences
import android.widget.RemoteViews
import com.kuripot.app.R

class WalletWidget : AppWidgetProvider() {

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    for (appWidgetId in appWidgetIds) {
      updateAppWidget(context, appWidgetManager, appWidgetId)
    }
  }

  companion object {
    fun updateAppWidget(
      context: Context,
      appWidgetManager: AppWidgetManager,
      appWidgetId: Int
    ) {
      val prefs: SharedPreferences = context.getSharedPreferences(
        "KuripotWidgetData", Context.MODE_PRIVATE
      )
      val totalBalance = prefs.getString("totalBalance", "₱0.00") ?: "₱0.00"
      val income = prefs.getString("income", "₱0.00") ?: "₱0.00"
      val expense = prefs.getString("expense", "₱0.00") ?: "₱0.00"

      val views = RemoteViews(context.packageName, R.layout.widget_wallet)
      views.setTextViewText(R.id.widget_balance, totalBalance)
      views.setTextViewText(R.id.widget_income, income)
      views.setTextViewText(R.id.widget_expense, expense)

      // Tap widget to open app
      val intent = context.packageManager
        .getLaunchIntentForPackage(context.packageName)
      val pendingIntent = android.app.PendingIntent.getActivity(
        context, 0, intent,
        android.app.PendingIntent.FLAG_UPDATE_CURRENT or
        android.app.PendingIntent.FLAG_IMMUTABLE
      )
      views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

      appWidgetManager.updateAppWidget(appWidgetId, views)
    }
  }
}
