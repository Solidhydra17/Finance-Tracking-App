package com.kuripot.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

/**
 * Home-screen launcher for income/expense — opens the same Add Transaction
 * screen in-app with ?type=income|expense (full form lives in the WebView).
 */
public class QuickAddWidget extends AppWidgetProvider {

  @Override
  public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
    for (int appWidgetId : appWidgetIds) {
      updateAppWidget(context, appWidgetManager, appWidgetId);
    }
  }

  public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
    RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quickadd);

    views.setOnClickPendingIntent(
      R.id.btn_quickadd_income,
      navPendingIntent(context, "/add-transaction?type=income", 1001)
    );
    views.setOnClickPendingIntent(
      R.id.btn_quickadd_expense,
      navPendingIntent(context, "/add-transaction?type=expense", 1002)
    );

    appWidgetManager.updateAppWidget(appWidgetId, views);
  }

  private static PendingIntent navPendingIntent(Context context, String path, int requestCode) {
    Intent intent = new Intent(context, MainActivity.class);
    intent.setAction(Intent.ACTION_MAIN);
    intent.addCategory(Intent.CATEGORY_LAUNCHER);
    intent.putExtra(MainActivity.EXTRA_NAVIGATE, path);
    intent.setFlags(
      Intent.FLAG_ACTIVITY_NEW_TASK
        | Intent.FLAG_ACTIVITY_CLEAR_TOP
        | Intent.FLAG_ACTIVITY_SINGLE_TOP
    );
    return PendingIntent.getActivity(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
  }
}
