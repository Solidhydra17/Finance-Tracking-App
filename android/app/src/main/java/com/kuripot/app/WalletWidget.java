package com.kuripot.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.graphics.Typeface;
import android.view.Gravity;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class WalletWidget extends AppWidgetProvider {

  // @capacitor/preferences stores data in "CapacitorStorage"
  private static final String PREFS_NAME = "CapacitorStorage";

  @Override
  public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
    for (int appWidgetId : appWidgetIds) {
      updateAppWidget(context, appWidgetManager, appWidgetId);
    }
  }

  public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
    SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

    String projectedBalance = prefs.getString("widget_projectedBalance", "₱0.00");
    String totalBalance     = prefs.getString("widget_totalBalance",     "₱0.00");
    String accountsJson     = prefs.getString("widget_accounts",         "[]");

    if (projectedBalance == null) projectedBalance = "₱0.00";
    if (totalBalance == null)     totalBalance     = "₱0.00";
    if (accountsJson == null)     accountsJson     = "[]";

    RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_wallet);

    // Set the main balance labels
    views.setTextViewText(R.id.widget_projected_balance,   projectedBalance);
    views.setTextViewText(R.id.widget_total_balance_sub,   "Total Wallet Balance: " + totalBalance);

    // Build per-account flipper items
    views.removeAllViews(R.id.widget_accounts_flipper);
    buildFlipperItems(context, views, accountsJson);

    // Tap to open app
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

  /**
   * Dynamically adds one child RemoteViews per account into the ViewFlipper.
   * Each child is a simple horizontal row:  [NAME]   [TYPE · BALANCE]
   */
  private static void buildFlipperItems(Context context, RemoteViews flipper, String json) {
    try {
      JSONArray arr = new JSONArray(json);

      if (arr.length() == 0) {
        // Show a single "no accounts" placeholder
        RemoteViews item = makeAccountRow(context, "No accounts found", "", "");
        flipper.addView(R.id.widget_accounts_flipper, item);
        return;
      }

      for (int i = 0; i < arr.length(); i++) {
        JSONObject obj     = arr.getJSONObject(i);
        String name        = obj.optString("name",    "Account");
        String type        = obj.optString("type",    "");
        String balance     = obj.optString("balance", "₱0.00");
        RemoteViews item   = makeAccountRow(context, name, type, balance);
        flipper.addView(R.id.widget_accounts_flipper, item);
      }

    } catch (JSONException e) {
      RemoteViews item = makeAccountRow(context, "—", "", "");
      flipper.addView(R.id.widget_accounts_flipper, item);
    }
  }

  /**
   * Builds one flipper row as a RemoteViews using a simple system layout.
   * We use android.R.layout.simple_list_item_2 as a base-free container,
   * but since we can't inflate custom XML dynamically in RemoteViews without
   * registering a separate layout resource, we use a pre-defined item layout.
   *
   * Using widget_account_item.xml (see res/layout/widget_account_item.xml).
   */
  private static RemoteViews makeAccountRow(Context context, String name, String type, String balance) {
    RemoteViews row = new RemoteViews(context.getPackageName(), R.layout.widget_account_item);
    row.setTextViewText(R.id.account_item_name,    name);
    row.setTextViewText(R.id.account_item_type,    type);
    row.setTextViewText(R.id.account_item_balance, balance);
    return row;
  }
}
