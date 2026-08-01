package com.kuripot.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class WalletWidget extends AppWidgetProvider {

  // Capacitor Preferences uses "_capacitorPreferences" as the SharedPreferences name
  private static final String PREFS_NAME = "_capacitorPreferences";

  @Override
  public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
    for (int appWidgetId : appWidgetIds) {
      updateAppWidget(context, appWidgetManager, appWidgetId);
    }
  }

  public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
    SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    String totalBalance = prefs.getString("widget_totalBalance", "₱0.00");
    String accountsJson = prefs.getString("widget_accounts", "[]");

    if (totalBalance == null) totalBalance = "₱0.00";
    if (accountsJson == null) accountsJson = "[]";

    RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_wallet);
    views.setTextViewText(R.id.widget_balance, totalBalance);

    String accountsText = buildAccountsText(accountsJson);
    views.setTextViewText(R.id.widget_accounts_summary, accountsText);

    Intent launchIntent = context.getPackageManager()
      .getLaunchIntentForPackage(context.getPackageName());
    if (launchIntent != null) {
      PendingIntent pendingIntent = PendingIntent.getActivity(
        context, 0, launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
      );
      views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
    }

    appWidgetManager.updateAppWidget(appWidgetId, views);
  }

  private static String buildAccountsText(String json) {
    try {
      JSONArray arr = new JSONArray(json);
      StringBuilder sb = new StringBuilder();
      for (int i = 0; i < arr.length(); i++) {
        JSONObject obj = arr.getJSONObject(i);
        String name = obj.getString("name");
        String balance = obj.getString("balance");
        if (sb.length() > 0) sb.append("   ·   ");
        sb.append(name).append("  ").append(balance);
      }
      return sb.toString();
    } catch (JSONException e) {
      return "";
    }
  }
}
